import { Types } from 'mongoose';
import { Match, IMatch } from '../../models/Match';
import { Registration } from '../../models/Registration';
import { Result } from '../../models/Result';
import { Standing } from '../../models/Standing';
import { RankingEntry } from '../../models/Ranking';
import { PlayerProfile } from '../../models/PlayerProfile';
import { Tournament } from '../../models/Tournament';
import { MatchStage, MatchStatus } from '../../common/types/enums';
import { ApiError } from '../../common/utils/ApiError';
import { AuthUser } from '../../common/middleware/auth';

const STANDINGS_STAGES = [MatchStage.GROUP, MatchStage.ROUND_ROBIN, MatchStage.SWISS, MatchStage.BOX_LEAGUE, MatchStage.LEAGUE];

export async function getMatch(matchId: string) {
  const match = await Match.findById(matchId)
    .populate({ path: 'sideA.registration', populate: 'player team' })
    .populate({ path: 'sideB.registration', populate: 'player team' })
    .populate('court');
  if (!match) throw ApiError.notFound('Match not found');
  return match;
}

export async function recordSetScore(matchId: string, sets: IMatch['sets'], user: AuthUser) {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
    throw ApiError.badRequest('Cannot edit score on a finalized match');
  }
  match.sets = sets;
  if (match.status === MatchStatus.SCHEDULED || match.status === MatchStatus.READY) {
    match.status = MatchStatus.IN_PROGRESS;
    match.startedAt = match.startedAt ?? new Date();
  }
  match.liveScoreEnabled = true;
  match.lastUpdatedBy = new Types.ObjectId(user.id);
  await match.save();
  return match;
}

export async function completeMatch(
  matchId: string,
  winnerSlot: 'sideA' | 'sideB',
  winReason: 'normal' | 'walkover' | 'retirement' | 'default',
  user: AuthUser
) {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status === MatchStatus.COMPLETED) throw ApiError.badRequest('Match already completed');

  match.winner = winnerSlot;
  match.winReason = winReason;
  match.status =
    winReason === 'walkover' ? MatchStatus.WALKOVER : winReason === 'retirement' ? MatchStatus.RETIRED : winReason === 'default' ? MatchStatus.DEFAULTED : MatchStatus.COMPLETED;
  match.completedAt = new Date();
  match.lastUpdatedBy = new Types.ObjectId(user.id);
  await match.save();

  await advanceWinner(match);
  await recordResult(match, user.id);
  if (STANDINGS_STAGES.includes(match.stage)) {
    await updateStandingsForMatch(match);
  }
  await awardRankingPoints(match);

  return match;
}

export async function suspendMatch(matchId: string, reason: string) {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  match.status = MatchStatus.SUSPENDED;
  match.suspendedAt = new Date();
  match.suspendReason = reason;
  await match.save();
  return match;
}

export async function resumeMatch(matchId: string) {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== MatchStatus.SUSPENDED) throw ApiError.badRequest('Match is not suspended');
  match.status = MatchStatus.IN_PROGRESS;
  match.suspendedAt = undefined;
  match.suspendReason = undefined;
  await match.save();
  return match;
}

export async function logMedicalTimeout(matchId: string, side: 'sideA' | 'sideB') {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  match.medicalTimeouts.push({ side, at: new Date() });
  await match.save();
  return match;
}

export async function assignOfficials(matchId: string, umpire?: string, referee?: string) {
  const match = await Match.findByIdAndUpdate(
    matchId,
    { ...(umpire ? { umpire } : {}), ...(referee ? { referee } : {}) },
    { new: true }
  );
  if (!match) throw ApiError.notFound('Match not found');
  return match;
}

/** Writes the winner (and, for elimination formats, the loser) into the downstream match slot(s). */
async function advanceWinner(match: IMatch) {
  const winnerRef = match.winner === 'sideA' ? match.sideA : match.sideB;
  const loserRef = match.winner === 'sideA' ? match.sideB : match.sideA;

  if (match.nextMatch && match.nextMatchSlot) {
    await Match.findByIdAndUpdate(match.nextMatch, {
      [`${match.nextMatchSlot}.registration`]: winnerRef.registration,
      [`${match.nextMatchSlot}.team`]: winnerRef.team,
    });
  }
  if (match.loserNextMatch && match.loserNextMatchSlot) {
    await Match.findByIdAndUpdate(match.loserNextMatch, {
      [`${match.loserNextMatchSlot}.registration`]: loserRef.registration,
      [`${match.loserNextMatchSlot}.team`]: loserRef.team,
    });
  }
}

function scoreSummary(match: IMatch): string {
  return match.sets.map((s) => `${s.sideA}-${s.sideB}`).join(', ') || match.winReason || '';
}

async function recordResult(match: IMatch, recordedBy: string) {
  const winnerRef = match.winner === 'sideA' ? match.sideA : match.sideB;
  const loserRef = match.winner === 'sideA' ? match.sideB : match.sideA;

  await Result.findOneAndUpdate(
    { match: match._id },
    {
      tournament: match.tournament,
      category: match.category,
      match: match._id,
      winnerRegistration: winnerRef.registration,
      loserRegistration: loserRef.registration,
      winnerTeam: winnerRef.team,
      loserTeam: loserRef.team,
      scoreSummary: scoreSummary(match),
      winReason: match.winReason,
      recordedBy,
      recordedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function updateStandingsForMatch(match: IMatch) {
  const won = match.winner === 'sideA' ? match.sideA : match.sideB;
  const lost = match.winner === 'sideA' ? match.sideB : match.sideA;

  const setsWon = match.sets.filter((s) => (match.winner === 'sideA' ? s.sideA > s.sideB : s.sideB > s.sideA)).length;
  const setsLost = match.sets.length - setsWon;
  const pointsWon = match.sets.reduce((acc, s) => acc + (match.winner === 'sideA' ? s.sideA : s.sideB), 0);
  const pointsLost = match.sets.reduce((acc, s) => acc + (match.winner === 'sideA' ? s.sideB : s.sideA), 0);

  await Promise.all([
    bumpStanding(match, won, { played: 1, won: 1, setsFor: setsWon, setsAgainst: setsLost, pointsFor: pointsWon, pointsAgainst: pointsLost, matchPoints: 3, form: 'W' }),
    bumpStanding(match, lost, { played: 1, lost: 1, setsFor: setsLost, setsAgainst: setsWon, pointsFor: pointsLost, pointsAgainst: pointsWon, matchPoints: 0, form: 'L' }),
  ]);

  await recomputeRanksForGroup(match.category, match.groupId);
}

async function bumpStanding(
  match: IMatch,
  side: IMatch['sideA'],
  delta: { played: number; won?: number; lost?: number; setsFor: number; setsAgainst: number; pointsFor: number; pointsAgainst: number; matchPoints: number; form: 'W' | 'L' }
) {
  const key = side.registration ? { registration: side.registration } : { team: side.team };
  if (!side.registration && !side.team) return;

  await Standing.findOneAndUpdate(
    { tournament: match.tournament, category: match.category, groupId: match.groupId, ...key },
    {
      $inc: {
        played: delta.played,
        won: delta.won ?? 0,
        lost: delta.lost ?? 0,
        setsFor: delta.setsFor,
        setsAgainst: delta.setsAgainst,
        pointsFor: delta.pointsFor,
        pointsAgainst: delta.pointsAgainst,
        matchPoints: delta.matchPoints,
      },
      $push: { form: { $each: [delta.form], $slice: -5 } },
      $setOnInsert: { tournament: match.tournament, category: match.category, groupId: match.groupId, ...key },
    },
    { upsert: true }
  );
}

async function recomputeRanksForGroup(categoryId: Types.ObjectId, groupId?: string) {
  const rows = await Standing.find({ category: categoryId, groupId }).sort({ matchPoints: -1, setsFor: -1, pointsFor: -1 });
  await Promise.all(
    rows.map((row, idx) => Standing.findByIdAndUpdate(row._id, { rank: idx + 1 }))
  );
}

/** National/international ranking points awarded on match completion, scaled by tournament type. */
async function awardRankingPoints(match: IMatch) {
  const tournament = await Tournament.findById(match.tournament);
  if (!tournament) return;
  if (!tournament.nationalRankingEligible && !tournament.internationalRankingEligible) return;

  const winnerRef = match.winner === 'sideA' ? match.sideA : match.sideB;
  if (!winnerRef.registration) return;

  const registration = await Registration.findById(winnerRef.registration);
  if (!registration?.player) return;

  const scope = tournament.internationalRankingEligible ? 'international' : 'national';
  const basePoints = match.stage === MatchStage.KNOCKOUT ? 20 : 10;

  await RankingEntry.create({
    player: registration.player,
    sport: tournament.sport,
    scope,
    tournament: tournament._id,
    category: match.category,
    points: basePoints,
    reason: `Match win (${match.stage})`,
  });

  await PlayerProfile.findOneAndUpdate(
    { user: registration.player, sport: tournament.sport },
    { $inc: { matchesPlayed: 1, matchesWon: 1, currentStreak: 1 } },
    { upsert: true }
  );

  const loserRef = match.winner === 'sideA' ? match.sideB : match.sideA;
  if (loserRef.registration) {
    const loserReg = await Registration.findById(loserRef.registration);
    if (loserReg?.player) {
      await PlayerProfile.findOneAndUpdate(
        { user: loserReg.player, sport: tournament.sport },
        { $inc: { matchesPlayed: 1, matchesLost: 1 }, $set: { currentStreak: 0 } },
        { upsert: true }
      );
    }
  }
}
