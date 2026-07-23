import { BracketSide, MatchStage } from '../../../common/types/enums';
import { EngineDrawResult, EngineMatch, EngineParticipant, EngineRound, EngineSlot } from './types';
import { nextPowerOfTwo, placeIntoBracket, ProtectedSeedingOptions } from './seeding';
import { nextTempId } from './singleElimination';

/**
 * Double-elimination bracket: a winners bracket (WB) built like single
 * elimination, plus a losers bracket (LB) where WB losers are dropped in
 * round-by-round, and a single Grand Final between the WB champion and the
 * LB champion. Correct for power-of-two participant counts (byes pad
 * non-power-of-two fields). The LB drop-in order here is a generic
 * alternating minor/major-round construction; it guarantees correct
 * elimination semantics (2 losses = out) but is not guaranteed to be the
 * "rematch-minimizing" seed table used by some official federations —
 * acceptable for general club/tournament play.
 */
export function generateDoubleElimination(
  ranked: EngineParticipant[],
  options?: { protectedSeeding?: ProtectedSeedingOptions }
): EngineDrawResult {
  const n = ranked.length;
  const bracketSize = nextPowerOfTwo(Math.max(2, n));
  const slots = placeIntoBracket(ranked, bracketSize, options?.protectedSeeding);
  const totalWbRounds = Math.log2(bracketSize);

  const rounds: EngineRound[] = [];
  const matches: EngineMatch[] = [];

  // ---- Winners bracket ----
  const wbRoundsMatches: EngineMatch[][] = [];
  let prevRound: EngineMatch[] = [];
  for (let r = 1; r <= totalWbRounds; r++) {
    const roundMatches: EngineMatch[] = [];
    const count = bracketSize / Math.pow(2, r);
    rounds.push({ roundNumber: r, name: wbRoundName(r, totalWbRounds), stage: MatchStage.KNOCKOUT });

    for (let i = 0; i < count; i++) {
      let sideA: EngineSlot;
      let sideB: EngineSlot;
      if (r === 1) {
        const a = slots[i * 2];
        const b = slots[i * 2 + 1];
        sideA = a ? { participantId: a.id } : { isBye: true, label: 'BYE' };
        sideB = b ? { participantId: b.id } : { isBye: true, label: 'BYE' };
      } else {
        const m1 = prevRound[i * 2];
        const m2 = prevRound[i * 2 + 1];
        sideA = winnerSlotOf(m1);
        sideB = winnerSlotOf(m2);
      }
      const isBye = !!(sideA.isBye || sideB.isBye);
      const match: EngineMatch = {
        tempId: nextTempId('WB'),
        roundNumber: r,
        roundName: wbRoundName(r, totalWbRounds),
        stage: MatchStage.KNOCKOUT,
        bracketSide: BracketSide.WINNERS,
        sideA,
        sideB,
        isBye,
      };
      if (r > 1) {
        prevRound[i * 2].nextMatchTempId = match.tempId;
        prevRound[i * 2].nextMatchSlot = 'sideA';
        prevRound[i * 2 + 1].nextMatchTempId = match.tempId;
        prevRound[i * 2 + 1].nextMatchSlot = 'sideB';
      }
      roundMatches.push(match);
      matches.push(match);
    }
    wbRoundsMatches.push(roundMatches);
    prevRound = roundMatches;
  }

  // ---- Losers bracket ----
  const lbRoundsMatches: EngineMatch[][] = [];
  let lbRoundCounter = 1;

  // LB round 1: pair up WB round-1 losers
  let currentLbWinners: EngineSlot[] = [];
  {
    const losersR1 = wbRoundsMatches[0].map((m) => loserSlotOf(m));
    const roundMatches: EngineMatch[] = [];
    for (let i = 0; i < losersR1.length / 2; i++) {
      const sideA = losersR1[i * 2];
      const sideB = losersR1[i * 2 + 1];
      const isBye = !!(sideA.isBye || sideB.isBye);
      const match: EngineMatch = {
        tempId: nextTempId('LB'),
        roundNumber: 100 + lbRoundCounter,
        roundName: `Losers Round ${lbRoundCounter}`,
        stage: MatchStage.KNOCKOUT,
        bracketSide: BracketSide.LOSERS,
        sideA,
        sideB,
        isBye,
      };
      linkLoserSource(wbRoundsMatches[0][i * 2], match, 'sideA');
      linkLoserSource(wbRoundsMatches[0][i * 2 + 1], match, 'sideB');
      roundMatches.push(match);
      matches.push(match);
    }
    rounds.push({ roundNumber: 100 + lbRoundCounter, name: `Losers Round ${lbRoundCounter}`, stage: MatchStage.KNOCKOUT });
    lbRoundsMatches.push(roundMatches);
    currentLbWinners = roundMatches.map(winnerSlotOf);
    lbRoundCounter++;
  }

  for (let d = 2; d <= totalWbRounds; d++) {
    const losersD = wbRoundsMatches[d - 1].map((m) => loserSlotOf(m));
    const majorMatches: EngineMatch[] = [];
    for (let i = 0; i < losersD.length; i++) {
      const sideA = currentLbWinners[currentLbWinners.length - 1 - i];
      const sideB = losersD[i];
      const isBye = !!(sideA.isBye || sideB.isBye);
      const match: EngineMatch = {
        tempId: nextTempId('LB'),
        roundNumber: 100 + lbRoundCounter,
        roundName: d === totalWbRounds ? 'Losers Final' : `Losers Round ${lbRoundCounter}`,
        stage: MatchStage.KNOCKOUT,
        bracketSide: BracketSide.LOSERS,
        sideA,
        sideB,
        isBye,
      };
      linkLoserSource(wbRoundsMatches[d - 1][i], match, 'sideB');
      majorMatches.push(match);
      matches.push(match);
    }
    rounds.push({ roundNumber: 100 + lbRoundCounter, name: majorMatches[0]?.roundName ?? `Losers Round ${lbRoundCounter}`, stage: MatchStage.KNOCKOUT });
    lbRoundsMatches.push(majorMatches);
    currentLbWinners = majorMatches.map(winnerSlotOf);
    lbRoundCounter++;

    if (d < totalWbRounds && currentLbWinners.length > 1) {
      const minorMatches: EngineMatch[] = [];
      for (let i = 0; i < currentLbWinners.length / 2; i++) {
        const sideA = currentLbWinners[i * 2];
        const sideB = currentLbWinners[i * 2 + 1];
        const isBye = !!(sideA.isBye || sideB.isBye);
        const match: EngineMatch = {
          tempId: nextTempId('LB'),
          roundNumber: 100 + lbRoundCounter,
          roundName: `Losers Round ${lbRoundCounter}`,
          stage: MatchStage.KNOCKOUT,
          bracketSide: BracketSide.LOSERS,
          sideA,
          sideB,
          isBye,
        };
        minorMatches.push(match);
        matches.push(match);
      }
      rounds.push({ roundNumber: 100 + lbRoundCounter, name: `Losers Round ${lbRoundCounter}`, stage: MatchStage.KNOCKOUT });
      lbRoundsMatches.push(minorMatches);
      currentLbWinners = minorMatches.map(winnerSlotOf);
      lbRoundCounter++;
    }
  }

  // ---- Grand Final ----
  const wbChampionMatch = wbRoundsMatches[wbRoundsMatches.length - 1][0];
  const lbChampionSlot = currentLbWinners[0];
  const grandFinal: EngineMatch = {
    tempId: nextTempId('GF'),
    roundNumber: 999,
    roundName: 'Grand Final',
    stage: MatchStage.KNOCKOUT,
    bracketSide: BracketSide.GRAND_FINAL,
    sideA: winnerSlotOf(wbChampionMatch),
    sideB: lbChampionSlot,
    isBye: false,
  };
  wbChampionMatch.nextMatchTempId = grandFinal.tempId;
  wbChampionMatch.nextMatchSlot = 'sideA';
  const lbFinalMatch = lbRoundsMatches[lbRoundsMatches.length - 1][0];
  lbFinalMatch.nextMatchTempId = grandFinal.tempId;
  lbFinalMatch.nextMatchSlot = 'sideB';

  matches.push(grandFinal);
  rounds.push({ roundNumber: 999, name: 'Grand Final', stage: MatchStage.KNOCKOUT });

  const seededPositions = ranked.map((p, i) => ({
    participantId: p.id,
    seed: p.seed ?? i + 1,
    position: slots.findIndex((s) => s?.id === p.id) + 1,
  }));

  return { groups: [], rounds, matches, seededPositions };
}

function wbRoundName(r: number, total: number): string {
  const remaining = total - r + 1;
  if (remaining === 1) return 'Winners Final';
  if (remaining === 2) return 'Winners Semifinal';
  if (remaining === 3) return 'Winners Quarterfinal';
  return `Winners Round ${r}`;
}

function winnerSlotOf(m: EngineMatch): EngineSlot {
  if (m.isBye) {
    const real = m.sideA.isBye ? m.sideB : m.sideA;
    if (real.participantId) return { participantId: real.participantId };
  }
  return { sourceMatchTempId: m.tempId, sourceSlot: 'winner' };
}

function loserSlotOf(m: EngineMatch): EngineSlot {
  if (m.isBye) {
    // no real loser produced by a bye match
    return { isBye: true, label: 'BYE' };
  }
  return { sourceMatchTempId: m.tempId, sourceSlot: 'loser' };
}

function linkLoserSource(wbMatch: EngineMatch, lbMatch: EngineMatch, slot: 'sideA' | 'sideB') {
  if (wbMatch.isBye) return; // nothing to link, already a synthetic BYE slot
  wbMatch.loserNextMatchTempId = lbMatch.tempId;
  wbMatch.loserNextMatchSlot = slot;
}
