import { Registration } from '../../models/Registration';
import { TournamentCategory } from '../../models/TournamentCategory';
import { Tournament } from '../../models/Tournament';
import { RegistrationEntryType, RegistrationStatus, TournamentStatus } from '../../common/types/enums';
import { ApiError } from '../../common/utils/ApiError';
import { checkEligibility } from '../tournaments/tournaments.service';
import { AuthUser } from '../../common/middleware/auth';
import { User } from '../../models/User';

export interface RegisterEntryInput {
  categoryId: string;
  player?: string;
  partner?: string;
  team?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
  waiverSigned?: boolean;
  medicalDeclarationAcknowledged?: boolean;
}

export async function registerEntry(user: AuthUser, tournamentId: string, input: RegisterEntryInput) {
  const [tournament, category] = await Promise.all([
    Tournament.findById(tournamentId),
    TournamentCategory.findOne({ _id: input.categoryId, tournament: tournamentId }),
  ]);
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (!category) throw ApiError.notFound('Category not found');

  if (![TournamentStatus.REGISTRATION_OPEN, TournamentStatus.PUBLISHED].includes(tournament.status)) {
    if (!(tournament.status === TournamentStatus.REGISTRATION_CLOSED && tournament.registrationRules.lateEntryAllowed)) {
      throw ApiError.badRequest('Registration is not currently open for this tournament');
    }
  }
  if (category.status !== 'open' && category.status !== 'draft') {
    throw ApiError.badRequest('This category is no longer accepting registrations');
  }

  const now = new Date();
  const closeAt = category.registrationCloseAt ?? tournament.registrationCloseAt;
  const isLate = now > closeAt;
  if (isLate && !tournament.registrationRules.lateEntryAllowed) {
    throw ApiError.badRequest('Registration for this category has closed');
  }

  if (category.isTeamEvent) {
    if (!input.team) throw ApiError.badRequest('A team is required for this category');
  } else {
    const playerId = input.player ?? user.id;
    const player = await User.findById(playerId);
    if (!player) throw ApiError.notFound('Player not found');

    const eligibility = await checkEligibility(tournament, {
      userId: playerId,
      club: player.club ? String(player.club) : undefined,
      academy: player.academy ? String(player.academy) : undefined,
      company: player.company ? String(player.company) : undefined,
      country: player.country,
    });
    if (!eligibility.eligible) throw ApiError.forbidden(eligibility.reason);
  }

  const existing = await Registration.findOne({
    category: category._id,
    ...(category.isTeamEvent ? { team: input.team } : { player: input.player ?? user.id }),
    status: { $ne: RegistrationStatus.WITHDRAWN },
  });
  if (existing) throw ApiError.conflict('Already registered for this category');

  const approvedCount = await Registration.countDocuments({
    category: category._id,
    status: { $in: [RegistrationStatus.APPROVED, RegistrationStatus.CHECKED_IN] },
  });

  const isFull = approvedCount >= category.maxParticipants;
  const requiresApproval = tournament.registrationRules.approvalMode === 'manual' || tournament.type === 'private';

  let status = RegistrationStatus.PENDING;
  let waitlistPosition: number | undefined;
  let entryType = isLate ? RegistrationEntryType.LATE_ENTRY : RegistrationEntryType.DIRECT;

  if (isFull) {
    if (!tournament.registrationRules.waitlistEnabled) {
      throw ApiError.conflict('This category is full and waitlisting is disabled');
    }
    status = RegistrationStatus.WAITLISTED;
    const waitlistCount = await Registration.countDocuments({ category: category._id, status: RegistrationStatus.WAITLISTED });
    waitlistPosition = waitlistCount + 1;
  } else if (!requiresApproval) {
    status = RegistrationStatus.APPROVED;
  }

  const registration = await Registration.create({
    tournament: tournamentId,
    category: category._id,
    player: category.isTeamEvent ? undefined : input.player ?? user.id,
    partner: input.partner,
    team: category.isTeamEvent ? input.team : undefined,
    status,
    entryType,
    waitlistPosition,
    emergencyContact: input.emergencyContact,
    waiverSigned: !!input.waiverSigned,
    waiverSignedAt: input.waiverSigned ? new Date() : undefined,
    medicalDeclarationAcknowledged: !!input.medicalDeclarationAcknowledged,
    registeredBy: user.id,
  });

  return registration;
}

export async function approveRegistration(registrationId: string, approverId: string) {
  const registration = await Registration.findById(registrationId);
  if (!registration) throw ApiError.notFound('Registration not found');
  if (registration.status !== RegistrationStatus.PENDING) {
    throw ApiError.badRequest('Only pending registrations can be approved');
  }
  registration.status = RegistrationStatus.APPROVED;
  registration.approvedBy = approverId as unknown as typeof registration.approvedBy;
  registration.approvedAt = new Date();
  await registration.save();
  return registration;
}

export async function rejectRegistration(registrationId: string, approverId: string, reason?: string) {
  const registration = await Registration.findById(registrationId);
  if (!registration) throw ApiError.notFound('Registration not found');
  registration.status = RegistrationStatus.REJECTED;
  registration.approvedBy = approverId as unknown as typeof registration.approvedBy;
  registration.rejectionReason = reason;
  await registration.save();
  return registration;
}

export async function withdrawRegistration(registrationId: string, requesterId: string, isAdmin: boolean) {
  const registration = await Registration.findById(registrationId);
  if (!registration) throw ApiError.notFound('Registration not found');
  if (!isAdmin && String(registration.player) !== requesterId && String(registration.registeredBy) !== requesterId) {
    throw ApiError.forbidden();
  }
  registration.status = RegistrationStatus.WITHDRAWN;
  registration.withdrawnAt = new Date();
  await registration.save();

  await promoteFromWaitlist(String(registration.category));
  return registration;
}

/** Promotes the next waitlisted entrant into an APPROVED slot when a spot opens up. */
export async function promoteFromWaitlist(categoryId: string) {
  const category = await TournamentCategory.findById(categoryId);
  if (!category) return null;

  const approvedCount = await Registration.countDocuments({
    category: categoryId,
    status: { $in: [RegistrationStatus.APPROVED, RegistrationStatus.CHECKED_IN] },
  });
  if (approvedCount >= category.maxParticipants) return null;

  const next = await Registration.findOne({ category: categoryId, status: RegistrationStatus.WAITLISTED }).sort({ waitlistPosition: 1 });
  if (!next) return null;

  next.status = RegistrationStatus.APPROVED;
  next.entryType = RegistrationEntryType.WAITLIST_PROMOTED;
  next.waitlistPosition = undefined;
  await next.save();
  return next;
}

export async function grantWildcard(categoryId: string, registrationInput: RegisterEntryInput, tournamentId: string, grantedBy: AuthUser) {
  const category = await TournamentCategory.findById(categoryId);
  if (!category) throw ApiError.notFound('Category not found');
  const registration = await registerEntry(grantedBy, tournamentId, registrationInput);
  registration.status = RegistrationStatus.APPROVED;
  registration.entryType = RegistrationEntryType.WILDCARD;
  registration.approvedBy = grantedBy.id as unknown as typeof registration.approvedBy;
  registration.approvedAt = new Date();
  await registration.save();
  return registration;
}

export async function checkIn(registrationId: string, method: 'qr' | 'manual') {
  const registration = await Registration.findById(registrationId);
  if (!registration) throw ApiError.notFound('Registration not found');
  if (registration.status !== RegistrationStatus.APPROVED) {
    throw ApiError.badRequest('Only approved registrations can check in');
  }
  registration.checkIn = { isCheckedIn: true, checkedInAt: new Date(), method };
  registration.status = RegistrationStatus.CHECKED_IN;
  await registration.save();
  return registration;
}
