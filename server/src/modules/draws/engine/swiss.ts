import { MatchStage, BracketSide } from '../../../common/types/enums';
import { EngineMatch, EngineRound } from './types';
import { nextTempId } from './singleElimination';

export interface SwissStanding {
  participantId: string;
  score: number; // match points accumulated so far
  rating?: number;
  opponentsFaced: string[]; // participant ids already played, to avoid rematches
}

/**
 * Generates pairings for a single Swiss round given current standings.
 * Round 1 (all scores 0) pairs top half vs bottom half by rating, which is
 * the common convention. Later rounds group players by score and pair
 * within score groups, falling back to the nearest score group when an odd
 * player or an unavoidable rematch is encountered. One player receives a
 * "bye" (auto win, +1 score) when the field is odd — never the same player
 * twice if avoidable.
 */
export function generateSwissRound(
  standings: SwissStanding[],
  roundNumber: number,
  options?: { groupId?: string; priorByePlayerIds?: string[] }
): { matches: EngineMatch[]; round: EngineRound; byePlayerId?: string } {
  const groupId = options?.groupId;
  const round: EngineRound = { roundNumber, name: `Swiss Round ${roundNumber}`, stage: MatchStage.SWISS, groupId };

  const pool = [...standings].sort((a, b) => b.score - a.score || (b.rating ?? 0) - (a.rating ?? 0));

  let byePlayerId: string | undefined;
  if (pool.length % 2 !== 0) {
    const priorBye = new Set(options?.priorByePlayerIds ?? []);
    const idx = [...pool].reverse().findIndex((p) => !priorBye.has(p.participantId));
    const byeIdx = idx === -1 ? pool.length - 1 : pool.length - 1 - idx;
    byePlayerId = pool[byeIdx].participantId;
    pool.splice(byeIdx, 1);
  }

  const matches: EngineMatch[] = [];
  const used = new Set<string>();

  for (let i = 0; i < pool.length; i++) {
    const p1 = pool[i];
    if (used.has(p1.participantId)) continue;
    let opponentIdx = -1;
    for (let j = i + 1; j < pool.length; j++) {
      const p2 = pool[j];
      if (used.has(p2.participantId)) continue;
      if (!p1.opponentsFaced.includes(p2.participantId)) {
        opponentIdx = j;
        break;
      }
    }
    // no fresh opponent found -> allow a rematch with the closest-ranked available player
    if (opponentIdx === -1) {
      for (let j = i + 1; j < pool.length; j++) {
        if (!used.has(pool[j].participantId)) {
          opponentIdx = j;
          break;
        }
      }
    }
    if (opponentIdx === -1) break;

    const p2 = pool[opponentIdx];
    used.add(p1.participantId);
    used.add(p2.participantId);

    matches.push({
      tempId: nextTempId('SW'),
      roundNumber,
      roundName: round.name,
      stage: MatchStage.SWISS,
      bracketSide: BracketSide.NONE,
      groupId,
      sideA: { participantId: p1.participantId },
      sideB: { participantId: p2.participantId },
      isBye: false,
    });
  }

  if (byePlayerId) {
    matches.push({
      tempId: nextTempId('SW'),
      roundNumber,
      roundName: round.name,
      stage: MatchStage.SWISS,
      bracketSide: BracketSide.NONE,
      groupId,
      sideA: { participantId: byePlayerId },
      sideB: { isBye: true, label: 'BYE' },
      isBye: true,
    });
  }

  return { matches, round, byePlayerId };
}

/** Recommended Swiss round count for a field of n players (ceil(log2(n)) rounds, min 3). */
export function recommendedSwissRounds(n: number): number {
  return Math.max(3, Math.ceil(Math.log2(Math.max(2, n))));
}

/** Sort standings by score, then Buchholz (sum of opponents' scores) as tiebreak. */
export function computeBuchholz(standings: SwissStanding[], scoreByPlayer: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  for (const s of standings) {
    const sum = s.opponentsFaced.reduce((acc, oppId) => acc + (scoreByPlayer.get(oppId) ?? 0), 0);
    result.set(s.participantId, sum);
  }
  return result;
}
