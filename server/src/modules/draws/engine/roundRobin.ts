import { BracketSide, MatchStage } from '../../../common/types/enums';
import { EngineDrawResult, EngineMatch, EngineParticipant, EngineRound } from './types';
import { nextTempId } from './singleElimination';

/**
 * Classic circle-method round robin: with n participants (odd counts padded
 * with a "BYE" ghost that gives that round's opponent a rest), everyone
 * plays everyone exactly once (or twice if `homeAndAway`).
 */
export function generateRoundRobin(
  participants: EngineParticipant[],
  options?: { groupId?: string; stage?: MatchStage; homeAndAway?: boolean; roundOffset?: number }
): EngineDrawResult {
  const stage = options?.stage ?? MatchStage.ROUND_ROBIN;
  const groupId = options?.groupId;
  const roundOffset = options?.roundOffset ?? 0;

  const list: (EngineParticipant | null)[] = [...participants];
  if (list.length % 2 !== 0) list.push(null); // bye ghost

  const n = list.length;
  const numRounds = n - 1;
  const half = n / 2;

  const rounds: EngineRound[] = [];
  const matches: EngineMatch[] = [];

  let arr = [...list];
  for (let r = 0; r < numRounds; r++) {
    const roundNumber = r + 1 + roundOffset;
    rounds.push({ roundNumber, name: `Round ${roundNumber}`, stage, groupId });

    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (!a || !b) continue; // bye round for whoever drew the ghost
      const match: EngineMatch = {
        tempId: nextTempId('RR'),
        roundNumber,
        roundName: `Round ${roundNumber}`,
        stage,
        bracketSide: BracketSide.NONE,
        groupId,
        sideA: { participantId: a.id },
        sideB: { participantId: b.id },
        isBye: false,
      };
      matches.push(match);
    }

    // rotate (keep first fixed)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as EngineParticipant | null);
    arr = [fixed, ...rest];
  }

  if (options?.homeAndAway) {
    const secondLeg = matches.map((m) => ({
      ...m,
      tempId: nextTempId('RR'),
      roundNumber: m.roundNumber + numRounds,
      roundName: `Round ${m.roundNumber + numRounds}`,
      sideA: m.sideB,
      sideB: m.sideA,
    }));
    secondLeg.forEach((m) => rounds.push({ roundNumber: m.roundNumber, name: m.roundName, stage, groupId }));
    matches.push(...secondLeg);
  }

  const seededPositions = participants.map((p, i) => ({ participantId: p.id, seed: p.seed ?? i + 1, position: i + 1, groupId }));

  return { groups: groupId ? [{ groupId, name: groupId, participantCount: participants.length }] : [], rounds, matches, seededPositions };
}

/**
 * Splits participants into balanced groups (used by Group Stage + Knockout
 * and Box League) and runs a round robin within each group.
 */
export function generateGroupedRoundRobin(
  ranked: EngineParticipant[],
  groupCount: number,
  options?: { stage?: MatchStage; groupPrefix?: string }
): EngineDrawResult {
  const groups: EngineParticipant[][] = Array.from({ length: groupCount }, () => []);
  // snake-draft distribution so group strength is balanced by seed
  let dir = 1;
  let g = 0;
  for (const p of ranked) {
    groups[g].push(p);
    if (dir === 1 && g === groupCount - 1) dir = -1;
    else if (dir === -1 && g === 0) dir = 1;
    else g += dir;
  }

  const allRounds: EngineRound[] = [];
  const allMatches: EngineMatch[] = [];
  const allGroups: EngineDrawResult['groups'] = [];
  const allPositions: EngineDrawResult['seededPositions'] = [];

  groups.forEach((groupParticipants, idx) => {
    const groupId = `${options?.groupPrefix ?? 'G'}${idx + 1}`;
    const result = generateRoundRobin(groupParticipants, { groupId, stage: options?.stage });
    allRounds.push(...result.rounds);
    allMatches.push(...result.matches);
    allGroups.push({ groupId, name: `Group ${String.fromCharCode(65 + idx)}`, participantCount: groupParticipants.length });
    allPositions.push(...result.seededPositions);
  });

  return { groups: allGroups, rounds: allRounds, matches: allMatches, seededPositions: allPositions };
}
