import { MatchStage } from '../../../common/types/enums';
import { EngineDrawResult, EngineParticipant } from './types';
import { generateGroupedRoundRobin } from './roundRobin';
import { generateSingleElimination } from './singleElimination';

/** Phase 1: split into groups and round-robin within each. */
export function generateGroupStage(ranked: EngineParticipant[], groupCount: number): EngineDrawResult {
  return generateGroupedRoundRobin(ranked, groupCount, { stage: MatchStage.GROUP });
}

/**
 * Phase 2: once group standings are final, build the knockout bracket from
 * the top `qualifiersPerGroup` finishers of each group. Seeding interleaves
 * group winners/runners-up so group-mates don't re-meet immediately
 * (standard "group winner vs another group's runner-up" cross-bracket
 * pattern) via the engine's normal rating-based seeding on qualifier rank.
 */
export function generateKnockoutFromGroupStandings(
  qualifiers: { participantId: string; groupId: string; groupRank: number; rating?: number }[],
  options?: { thirdPlacePlayoff?: boolean }
): EngineDrawResult {
  // Interleave by rank-within-group first (all rank-1s, then all rank-2s, ...)
  // then hand off to standard seeding so cross-group pairing happens naturally.
  const ordered = [...qualifiers].sort((a, b) => a.groupRank - b.groupRank || a.groupId.localeCompare(b.groupId));
  const ranked: EngineParticipant[] = ordered.map((q, i) => ({ id: q.participantId, seed: i + 1, rating: q.rating }));

  return generateSingleElimination(ranked, {
    thirdPlacePlayoff: options?.thirdPlacePlayoff,
    stage: MatchStage.KNOCKOUT,
  });
}
