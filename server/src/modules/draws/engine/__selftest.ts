/* eslint-disable no-console */
/**
 * Standalone smoke test for the draw engine — run with `npx tsx
 * src/modules/draws/engine/__selftest.ts`. Not a persisted test file (no DB,
 * no test runner dependency); asserts core invariants for each format so
 * regressions in bracket math surface immediately. Delete or move under a
 * proper test runner (jest/vitest) once one is added to the project.
 */
import { TournamentFormat, SeedingMethod } from '../../../common/types/enums';
import { generateDraw } from './index';
import { EngineParticipant } from './types';

function mkParticipants(n: number): EngineParticipant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `P${i + 1}`, rating: 1000 + (n - i) }));
}

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${msg}`);
  }
}

// ---- Single elimination ----
for (const n of [2, 3, 5, 8, 13, 16]) {
  const draw = generateDraw({
    participants: mkParticipants(n),
    format: TournamentFormat.SINGLE_ELIMINATION,
    seedingMethod: SeedingMethod.RATING_BASED,
  });
  const round1 = draw.matches.filter((m) => m.roundNumber === 1);
  const totalMatches = draw.matches.length;
  const expectedBracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  assert(round1.length === expectedBracketSize / 2, `SE n=${n}: round1 has ${round1.length} matches (expect ${expectedBracketSize / 2})`);
  assert(totalMatches === expectedBracketSize - 1, `SE n=${n}: total matches ${totalMatches} === bracketSize-1 (${expectedBracketSize - 1})`);
}

// ---- Double elimination ----
for (const n of [4, 8, 16]) {
  const draw = generateDraw({
    participants: mkParticipants(n),
    format: TournamentFormat.DOUBLE_ELIMINATION,
    seedingMethod: SeedingMethod.RATING_BASED,
  });
  const gf = draw.matches.find((m) => m.roundName === 'Grand Final');
  assert(!!gf, `DE n=${n}: has a Grand Final match`);
  const wbMatches = draw.matches.filter((m) => m.bracketSide === 'winners');
  const lbMatches = draw.matches.filter((m) => m.bracketSide === 'losers');
  assert(wbMatches.length === n - 1, `DE n=${n}: winners bracket has ${wbMatches.length} matches (expect ${n - 1})`);
  assert(lbMatches.length === n - 2, `DE n=${n}: losers bracket has ${lbMatches.length} matches (expect ${n - 2})`);
}

// ---- Round robin ----
for (const n of [4, 5, 6]) {
  const draw = generateDraw({
    participants: mkParticipants(n),
    format: TournamentFormat.ROUND_ROBIN,
    seedingMethod: SeedingMethod.RANDOM,
  });
  const expectedMatches = (n * (n - 1)) / 2;
  assert(draw.matches.length === expectedMatches, `RR n=${n}: ${draw.matches.length} matches (expect ${expectedMatches})`);
  const perPlayerCount = new Map<string, number>();
  draw.matches.forEach((m) => {
    perPlayerCount.set(m.sideA.participantId!, (perPlayerCount.get(m.sideA.participantId!) ?? 0) + 1);
    perPlayerCount.set(m.sideB.participantId!, (perPlayerCount.get(m.sideB.participantId!) ?? 0) + 1);
  });
  const allPlayedNMinus1 = [...perPlayerCount.values()].every((c) => c === n - 1);
  assert(allPlayedNMinus1, `RR n=${n}: every player plays exactly ${n - 1} matches`);
}

// ---- Swiss (round 1 only) ----
{
  const draw = generateDraw({
    participants: mkParticipants(9),
    format: TournamentFormat.SWISS,
    seedingMethod: SeedingMethod.RATING_BASED,
  });
  assert(draw.isIncremental === true, 'Swiss: draw marked incremental');
  const byes = draw.matches.filter((m) => m.isBye);
  assert(byes.length === 1, `Swiss n=9: exactly 1 bye match (got ${byes.length})`);
  assert(draw.matches.length === 5, `Swiss n=9: round1 has 5 matches (got ${draw.matches.length})`);
}

// ---- Group + Knockout ----
{
  const draw = generateDraw({
    participants: mkParticipants(16),
    format: TournamentFormat.GROUP_KNOCKOUT,
    seedingMethod: SeedingMethod.RATING_BASED,
    formatConfig: { groupCount: 4 },
  });
  assert(draw.groups.length === 4, `GroupKO: 4 groups created (got ${draw.groups.length})`);
  assert(draw.matches.length === 4 * 6, `GroupKO: 6 matches per group of 4 (got ${draw.matches.length})`);
}

// ---- Box League ----
{
  const draw = generateDraw({
    participants: mkParticipants(10),
    format: TournamentFormat.BOX_LEAGUE,
    seedingMethod: SeedingMethod.RATING_BASED,
    formatConfig: { boxSize: 4 },
  });
  assert(draw.groups.length === 3, `BoxLeague n=10 boxSize=4: 3 boxes (got ${draw.groups.length})`);
}

console.log('\nSelf-test complete.');
