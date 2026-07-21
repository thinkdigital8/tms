import { MatchStage, BracketSide } from '../../../common/types/enums';
import { EngineDrawResult, EngineMatch, EngineParticipant } from './types';
import { generateGroupedRoundRobin } from './roundRobin';
import { nextTempId } from './singleElimination';

/**
 * Ladder League: participants start on a ladder ordered by rating/seed.
 * There is no fixed bracket — players challenge others within N ranks above
 * them, and winning swaps ladder positions. This returns the initial ladder
 * order (no matches); use `createLadderChallenge` per-challenge afterwards.
 */
export function initializeLadder(ranked: EngineParticipant[]): { participantId: string; ladderRank: number }[] {
  return ranked.map((p, i) => ({ participantId: p.id, ladderRank: i + 1 }));
}

export function createLadderChallenge(challengerId: string, defenderId: string, roundNumber: number): EngineMatch {
  return {
    tempId: nextTempId('LAD'),
    roundNumber,
    roundName: `Ladder Challenge`,
    stage: MatchStage.LADDER,
    bracketSide: BracketSide.NONE,
    sideA: { participantId: challengerId },
    sideB: { participantId: defenderId },
    isBye: false,
  };
}

/** After a ladder match completes: winner takes the better (lower) rank if they were the challenger. */
export function applyLadderResult(
  ladder: { participantId: string; ladderRank: number }[],
  winnerId: string,
  loserId: string
): { participantId: string; ladderRank: number }[] {
  const winner = ladder.find((l) => l.participantId === winnerId)!;
  const loser = ladder.find((l) => l.participantId === loserId)!;
  if (winner.ladderRank > loser.ladderRank) {
    // challenger (lower-ranked, higher number) won -> swap ranks
    const tmp = winner.ladderRank;
    winner.ladderRank = loser.ladderRank;
    loser.ladderRank = tmp;
  }
  return [...ladder].sort((a, b) => a.ladderRank - b.ladderRank);
}

/**
 * Box League: participants split into small boxes (typically 4-6) that
 * round-robin within the box. Standings after each cycle drive
 * promotion/relegation between boxes for the next cycle (handled by the
 * service layer once results land, using `computeBoxPromotions`).
 */
export function generateBoxLeague(ranked: EngineParticipant[], boxSize: number): EngineDrawResult {
  const boxCount = Math.max(1, Math.ceil(ranked.length / boxSize));
  return generateGroupedRoundRobin(ranked, boxCount, { stage: MatchStage.BOX_LEAGUE, groupPrefix: 'Box' });
}

export interface BoxStandingRow {
  groupId: string;
  participantId: string;
  rank: number;
}

/** Top finisher(s) of each box move up one box, bottom finisher(s) move down, for the next cycle. */
export function computeBoxPromotions(
  standingsByBox: BoxStandingRow[],
  boxOrder: string[],
  promoteCount = 1
): { participantId: string; fromBox: string; toBox: string }[] {
  const moves: { participantId: string; fromBox: string; toBox: string }[] = [];
  boxOrder.forEach((boxId, idx) => {
    const rows = standingsByBox.filter((r) => r.groupId === boxId).sort((a, b) => a.rank - b.rank);
    if (idx > 0) {
      rows.slice(0, promoteCount).forEach((r) => moves.push({ participantId: r.participantId, fromBox: boxId, toBox: boxOrder[idx - 1] }));
    }
    if (idx < boxOrder.length - 1) {
      rows.slice(-promoteCount).forEach((r) => moves.push({ participantId: r.participantId, fromBox: boxId, toBox: boxOrder[idx + 1] }));
    }
  });
  return moves;
}
