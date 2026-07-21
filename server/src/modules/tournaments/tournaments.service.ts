import { Tournament, ITournament } from '../../models/Tournament';
import { TournamentStaff } from '../../models/TournamentStaff';
import { TournamentStatus } from '../../common/types/enums';
import { Role, TournamentStaffRole } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';
import { slugify } from '../../common/utils/slugify';
import { AuthUser } from '../../common/middleware/auth';

const VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.DRAFT]: [TournamentStatus.PUBLISHED, TournamentStatus.CANCELLED],
  [TournamentStatus.PUBLISHED]: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_OPEN]: [TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_CLOSED]: [TournamentStatus.DRAW_PUBLISHED, TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  [TournamentStatus.DRAW_PUBLISHED]: [TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED],
  [TournamentStatus.IN_PROGRESS]: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
  [TournamentStatus.COMPLETED]: [],
  [TournamentStatus.CANCELLED]: [],
};

export async function createTournament(user: AuthUser, payload: Partial<ITournament>) {
  const slug = slugify(payload.name ?? 'tournament');
  const tournament = await Tournament.create({
    ...payload,
    slug,
    organizer: user.id,
    createdBy: user.id,
    status: TournamentStatus.DRAFT,
  });

  await TournamentStaff.create({
    tournament: tournament._id,
    user: user.id,
    role: TournamentStaffRole.OWNER,
    status: 'active',
  });

  return tournament;
}

export async function assertCanManage(user: AuthUser, tournamentId: string) {
  if (user.role === Role.SUPER_ADMIN || user.role === Role.TOURNAMENT_ADMIN) return;
  const staff = await TournamentStaff.findOne({
    tournament: tournamentId,
    user: user.id,
    role: { $in: [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER] },
    status: 'active',
  });
  if (!staff) throw ApiError.forbidden('You do not manage this tournament');
}

export async function updateTournament(user: AuthUser, tournamentId: string, payload: Partial<ITournament>) {
  await assertCanManage(user, tournamentId);
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  Object.assign(tournament, payload);
  await tournament.save();
  return tournament;
}

export async function transitionStatus(user: AuthUser, tournamentId: string, nextStatus: TournamentStatus) {
  await assertCanManage(user, tournamentId);
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  const allowed = VALID_TRANSITIONS[tournament.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw ApiError.badRequest(`Cannot transition tournament from ${tournament.status} to ${nextStatus}`);
  }

  tournament.status = nextStatus;
  if (nextStatus === TournamentStatus.PUBLISHED) tournament.isPublished = true;
  await tournament.save();
  return tournament;
}

export interface TournamentListFilters {
  type?: string;
  status?: string;
  sport?: string;
  search?: string;
  country?: string;
  from?: string;
  to?: string;
  organizer?: string;
  publishedOnly?: boolean;
}

export function buildTournamentFilter(filters: TournamentListFilters) {
  const query: Record<string, unknown> = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.sport) query.sport = filters.sport;
  if (filters.organizer) query.organizer = filters.organizer;
  if (filters.publishedOnly) query.isPublished = true;
  if (filters.search) query.$text = { $search: filters.search };
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = new Date(filters.from);
    if (filters.to) range.$lte = new Date(filters.to);
    query.startDate = range;
  }
  return query;
}

/**
 * Determines whether a user is eligible to register for a tournament based
 * on its `type` and `eligibility` scoping — the gate for Public / Private /
 * Club / Academy / Corporate / National / International tournament types.
 */
export async function checkEligibility(
  tournament: ITournament,
  candidate: { userId: string; club?: string; academy?: string; company?: string; country?: string }
): Promise<{ eligible: boolean; reason?: string }> {
  switch (tournament.type) {
    case 'public':
      return { eligible: true };
    case 'private':
      // private tournaments are invitation-only; actual invite check happens
      // at registration time via a wildcard/invite record, so registration
      // always lands as `pending` for admin approval.
      return { eligible: true };
    case 'club':
      if (!candidate.club || !tournament.eligibility.clubs.map(String).includes(String(candidate.club))) {
        return { eligible: false, reason: 'This tournament is restricted to members of specific clubs' };
      }
      return { eligible: true };
    case 'academy':
      if (!candidate.academy || !tournament.eligibility.academies.map(String).includes(String(candidate.academy))) {
        return { eligible: false, reason: 'This tournament is restricted to students of specific academies' };
      }
      return { eligible: true };
    case 'corporate':
      if (!candidate.company || !tournament.eligibility.companies.map(String).includes(String(candidate.company))) {
        return { eligible: false, reason: 'This tournament is restricted to employees of specific companies' };
      }
      return { eligible: true };
    case 'national':
      if (candidate.country && tournament.eligibility.countriesAllowed.length > 0 && !tournament.eligibility.countriesAllowed.includes(candidate.country)) {
        return { eligible: false, reason: 'This national tournament is restricted to eligible-country players' };
      }
      return { eligible: true };
    case 'international':
      return { eligible: true };
    default:
      return { eligible: true };
  }
}
