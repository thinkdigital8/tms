import { BracketSide, MatchStage } from '../../../common/types/enums';
import { EngineDrawResult, EngineMatch, EngineParticipant, EngineRound, EngineSlot } from './types';
import { nextPowerOfTwo, placeIntoBracket, ProtectedSeedingOptions } from './seeding';

function roundName(roundNumber: number, totalRounds: number, thirdPlace = false): string {
  const remaining = totalRounds - roundNumber + 1;
  if (thirdPlace) return 'Third Place Playoff';
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semifinal';
  if (remaining === 3) return 'Quarterfinal';
  return `Round of ${Math.pow(2, remaining)}`;
}

let tempCounter = 0;
function nextTempId(prefix = 'M'): string {
  tempCounter += 1;
  return `${prefix}${tempCounter}`;
}

/**
 * Builds a single-elimination bracket. Byes are given to the top seeds so
 * that no seeded player faces a bye disadvantage; round-1 byes are resolved
 * immediately (the advancing participant is placed directly into round 2).
 * Returns matches for ALL rounds; rounds beyond 1 whose participants are not
 * yet known carry `sourceMatchTempId` placeholders that the persistence
 * layer resolves as prior matches complete.
 */
export function generateSingleElimination(
  ranked: EngineParticipant[],
  options?: { protectedSeeding?: ProtectedSeedingOptions; thirdPlacePlayoff?: boolean; startRoundOffset?: number; stage?: MatchStage; groupId?: string }
): EngineDrawResult {
  const n = ranked.length;
  const bracketSize = nextPowerOfTwo(Math.max(2, n));
  const slots = placeIntoBracket(ranked, bracketSize, options?.protectedSeeding);
  const totalRounds = Math.log2(bracketSize);
  const stage = options?.stage ?? MatchStage.KNOCKOUT;

  const rounds: EngineRound[] = [];
  const matches: EngineMatch[] = [];

  // Round 1
  let currentRoundMatches: EngineMatch[] = [];
  const roundOffset = options?.startRoundOffset ?? 0;
  rounds.push({ roundNumber: 1 + roundOffset, name: roundName(1, totalRounds), stage, groupId: options?.groupId });

  for (let i = 0; i < bracketSize / 2; i++) {
    const a = slots[i * 2];
    const b = slots[i * 2 + 1];
    const isBye = !a || !b;
    const match: EngineMatch = {
      tempId: nextTempId(),
      roundNumber: 1 + roundOffset,
      roundName: roundName(1, totalRounds),
      stage,
      bracketSide: BracketSide.WINNERS,
      groupId: options?.groupId,
      sideA: a ? { participantId: a.id } : { isBye: true, label: 'BYE' },
      sideB: b ? { participantId: b.id } : { isBye: true, label: 'BYE' },
      isBye,
    };
    currentRoundMatches.push(match);
    matches.push(match);
  }

  let prevRoundMatches = currentRoundMatches;
  for (let r = 2; r <= totalRounds; r++) {
    currentRoundMatches = [];
    rounds.push({ roundNumber: r + roundOffset, name: roundName(r, totalRounds), stage, groupId: options?.groupId });

    for (let i = 0; i < prevRoundMatches.length / 2; i++) {
      const m1 = prevRoundMatches[i * 2];
      const m2 = prevRoundMatches[i * 2 + 1];

      const sideA = resolveSlotFromMatch(m1);
      const sideB = resolveSlotFromMatch(m2);
      const isBye = !!(sideA.isBye || sideB.isBye);

      const match: EngineMatch = {
        tempId: nextTempId(),
        roundNumber: r + roundOffset,
        roundName: roundName(r, totalRounds),
        stage,
        bracketSide: BracketSide.WINNERS,
        groupId: options?.groupId,
        sideA,
        sideB,
        isBye,
      };
      m1.nextMatchTempId = match.tempId;
      m1.nextMatchSlot = 'sideA';
      m2.nextMatchTempId = match.tempId;
      m2.nextMatchSlot = 'sideB';

      currentRoundMatches.push(match);
      matches.push(match);
    }
    prevRoundMatches = currentRoundMatches;
  }

  if (options?.thirdPlacePlayoff && totalRounds >= 2) {
    const semis = matches.filter((m) => m.roundNumber === totalRounds - 1 + roundOffset);
    if (semis.length === 2) {
      const thirdPlaceMatch: EngineMatch = {
        tempId: nextTempId(),
        roundNumber: totalRounds + roundOffset,
        roundName: 'Third Place Playoff',
        stage,
        bracketSide: BracketSide.NONE,
        groupId: options?.groupId,
        sideA: { sourceMatchTempId: semis[0].tempId, sourceSlot: 'loser' },
        sideB: { sourceMatchTempId: semis[1].tempId, sourceSlot: 'loser' },
        isBye: false,
      };
      semis[0].loserNextMatchTempId = thirdPlaceMatch.tempId;
      semis[0].loserNextMatchSlot = 'sideA';
      semis[1].loserNextMatchTempId = thirdPlaceMatch.tempId;
      semis[1].loserNextMatchSlot = 'sideB';
      matches.push(thirdPlaceMatch);
      rounds.push({ roundNumber: totalRounds + roundOffset, name: 'Third Place Playoff', stage, groupId: options?.groupId });
    }
  }

  const seededPositions = ranked.map((p, i) => ({ participantId: p.id, seed: p.seed ?? i + 1, position: slots.findIndex((s) => s?.id === p.id) + 1, groupId: options?.groupId }));

  return { groups: [], rounds, matches, seededPositions };
}

function resolveSlotFromMatch(m: EngineMatch): EngineSlot {
  if (m.isBye) {
    // whichever side is real auto-advances
    const real = m.sideA.isBye ? m.sideB : m.sideA;
    return real.participantId ? { participantId: real.participantId } : { sourceMatchTempId: m.tempId, sourceSlot: 'winner' };
  }
  return { sourceMatchTempId: m.tempId, sourceSlot: 'winner' };
}

export { nextTempId };
