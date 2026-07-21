import { Types } from 'mongoose';
import { Draw } from '../../models/Draw';
import { Round } from '../../models/Round';
import { Match } from '../../models/Match';
import { Registration } from '../../models/Registration';
import { TournamentCategory } from '../../models/TournamentCategory';
import { Tournament } from '../../models/Tournament';
import { PlayerProfile } from '../../models/PlayerProfile';
import { ApiError } from '../../common/utils/ApiError';
import { RegistrationStatus } from '../../common/types/enums';
import { generateDraw, EngineParticipant, EngineDrawResult, EngineMatch } from './engine';
import { AuthUser } from '../../common/middleware/auth';

async function buildEngineParticipants(categoryId: string, sportId: string): Promise<EngineParticipant[]> {
  const registrations = await Registration.find({
    category: categoryId,
    status: { $in: [RegistrationStatus.APPROVED, RegistrationStatus.CHECKED_IN] },
  }).populate('player', 'club city country');

  const participants: EngineParticipant[] = [];
  for (const reg of registrations) {
    const base: EngineParticipant = { id: String(reg._id), seed: reg.seed };
    if (reg.player) {
      const player = reg.player as unknown as { _id: Types.ObjectId; club?: Types.ObjectId; city?: string; country?: string };
      const profile = await PlayerProfile.findOne({ user: player._id, sport: sportId }).lean();
      base.rating = profile?.rating;
      base.clubId = player.club ? String(player.club) : undefined;
      base.city = player.city;
      base.country = player.country;
    } else if (reg.team) {
      base.clubId = undefined; // team affiliation conflicts are checked at team-registration time instead
    }
    participants.push(base);
  }
  return participants;
}

export async function generateAndPersistDraw(user: AuthUser, tournamentId: string, categoryId: string) {
  const [tournament, category] = await Promise.all([
    Tournament.findById(tournamentId),
    TournamentCategory.findOne({ _id: categoryId, tournament: tournamentId }),
  ]);
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (!category) throw ApiError.notFound('Category not found');

  const existing = await Draw.findOne({ category: categoryId });
  if (existing && existing.status === 'published') {
    throw ApiError.conflict('A draw has already been published for this category; use re-draw with explicit confirmation');
  }

  const participants = await buildEngineParticipants(categoryId, String(tournament.sport));
  if (participants.length < category.minParticipants) {
    throw ApiError.badRequest(`Not enough approved participants (${participants.length}) to meet the minimum (${category.minParticipants})`);
  }

  const engineResult = generateDraw({
    participants,
    format: category.format,
    seedingMethod: category.seeding.method,
    protectedSeeding: {
      avoidSameClub: category.seeding.avoidSameClub,
      avoidSameCity: category.seeding.avoidSameCity,
      avoidSameCountry: category.seeding.avoidSameCountry,
    },
    formatConfig: category.formatConfig,
  });

  if (existing) {
    await Round.deleteMany({ draw: existing._id });
    await Match.deleteMany({ draw: existing._id });
    await existing.deleteOne();
  }

  return persistEngineResult(user, tournament._id.toString(), category._id.toString(), engineResult, category.format, category.seeding.method);
}

async function persistEngineResult(
  user: AuthUser,
  tournamentId: string,
  categoryId: string,
  engineResult: EngineDrawResult,
  format: string,
  seedingMethod: string
) {
  const draw = await Draw.create({
    tournament: tournamentId,
    category: categoryId,
    format,
    seedingMethod,
    participants: engineResult.seededPositions.map((p) => ({
      registration: p.participantId,
      seed: p.seed,
      position: p.position,
      groupId: p.groupId,
    })),
    groups: engineResult.groups,
    status: 'draft',
    generatedBy: user.id,
  });

  // Pre-allocate Mongo ObjectIds for every engine match so forward references
  // (nextMatch / loserNextMatch) can be written in a single insert pass.
  const idMap = new Map<string, Types.ObjectId>();
  engineResult.matches.forEach((m) => idMap.set(m.tempId, new Types.ObjectId()));

  const roundDocs = await Round.insertMany(
    engineResult.rounds.map((r) => ({
      tournament: tournamentId,
      category: categoryId,
      draw: draw._id,
      roundNumber: r.roundNumber,
      name: r.name,
      stage: r.stage,
      groupId: r.groupId,
    }))
  );
  const roundIdByKey = new Map<string, Types.ObjectId>();
  roundDocs.forEach((r) => roundIdByKey.set(`${r.roundNumber}:${r.groupId ?? ''}`, r._id));

  let matchNumber = 1;
  const matchDocs = engineResult.matches.map((m: EngineMatch) => {
    const roundId = roundIdByKey.get(`${m.roundNumber}:${m.groupId ?? ''}`);
    const isByeResolved = m.isBye;
    const winnerSide: 'sideA' | 'sideB' | undefined = isByeResolved ? (m.sideA.isBye ? 'sideB' : 'sideA') : undefined;

    return {
      _id: idMap.get(m.tempId),
      tournament: tournamentId,
      category: categoryId,
      draw: draw._id,
      round: roundId,
      matchNumber: matchNumber++,
      stage: m.stage,
      bracketSide: m.bracketSide,
      groupId: m.groupId,
      sideA: m.sideA.participantId ? { registration: m.sideA.participantId } : { label: m.sideA.label ?? 'TBD' },
      sideB: m.sideB.participantId ? { registration: m.sideB.participantId } : { label: m.sideB.label ?? 'TBD' },
      nextMatch: m.nextMatchTempId ? idMap.get(m.nextMatchTempId) : undefined,
      nextMatchSlot: m.nextMatchSlot,
      loserNextMatch: m.loserNextMatchTempId ? idMap.get(m.loserNextMatchTempId) : undefined,
      loserNextMatchSlot: m.loserNextMatchSlot,
      isBye: m.isBye,
      status: isByeResolved ? 'completed' : 'scheduled',
      winner: winnerSide,
      winReason: isByeResolved ? 'bye' : undefined,
      completedAt: isByeResolved ? new Date() : undefined,
    };
  });

  await Match.insertMany(matchDocs);

  return Draw.findById(draw._id);
}

export async function publishDraw(user: AuthUser, tournamentId: string, drawId: string) {
  const draw = await Draw.findOne({ _id: drawId, tournament: tournamentId });
  if (!draw) throw ApiError.notFound('Draw not found');
  draw.status = 'published';
  draw.publishedAt = new Date();
  await draw.save();
  await TournamentCategory.findByIdAndUpdate(draw.category, { status: 'draw_published', drawPublishedAt: new Date() });
  return draw;
}

/** Manual fixture editing: swap two participants sitting in unplayed round-1 slots. */
export async function swapDrawSlots(tournamentId: string, drawId: string, matchAId: string, sideAKey: 'sideA' | 'sideB', matchBId: string, sideBKey: 'sideA' | 'sideB') {
  const draw = await Draw.findOne({ _id: drawId, tournament: tournamentId });
  if (!draw) throw ApiError.notFound('Draw not found');
  if (draw.status === 'locked') throw ApiError.badRequest('Draw is locked and can no longer be edited');

  const [matchA, matchB] = await Promise.all([Match.findById(matchAId), Match.findById(matchBId)]);
  if (!matchA || !matchB) throw ApiError.notFound('Match not found');
  if (matchA.status !== 'scheduled' || matchB.status !== 'scheduled') {
    throw ApiError.badRequest('Only unplayed matches can be edited');
  }

  const tmp = matchA[sideAKey];
  matchA[sideAKey] = matchB[sideBKey];
  matchB[sideBKey] = tmp;
  await matchA.save();
  await matchB.save();
  return { matchA, matchB };
}
