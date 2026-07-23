import { SeedingMethod, TournamentFormat } from '../../../common/types/enums';
import { EngineDrawResult, EngineParticipant } from './types';
import { rankParticipants, ProtectedSeedingOptions } from './seeding';
import { generateSingleElimination } from './singleElimination';
import { generateDoubleElimination } from './doubleElimination';
import { generateRoundRobin, generateGroupedRoundRobin } from './roundRobin';
import { generateBoxLeague, initializeLadder } from './ladderBoxLeague';
import { generateGroupStage } from './groupKnockout';
import { generateSwissRound } from './swiss';

export interface GenerateDrawInput {
  participants: EngineParticipant[];
  format: TournamentFormat;
  seedingMethod: SeedingMethod;
  protectedSeeding?: ProtectedSeedingOptions;
  formatConfig?: {
    groupCount?: number;
    qualifiersPerGroup?: number;
    boxSize?: number;
    swissRounds?: number;
    legsHomeAway?: boolean;
    thirdPlacePlayoff?: boolean;
  };
}

/**
 * Single entry point for draw generation. Ranks/seeds participants first,
 * then dispatches to the format-specific generator. Swiss only produces
 * round 1 up front (isIncremental) since later rounds depend on results.
 */
export function generateDraw(input: GenerateDrawInput): EngineDrawResult {
  const ranked = rankParticipants(input.participants, input.seedingMethod);
  const cfg = input.formatConfig ?? {};

  switch (input.format) {
    case TournamentFormat.SINGLE_ELIMINATION:
    case TournamentFormat.TEAM_KNOCKOUT:
      return generateSingleElimination(ranked, {
        protectedSeeding: input.protectedSeeding,
        thirdPlacePlayoff: cfg.thirdPlacePlayoff,
      });

    case TournamentFormat.DOUBLE_ELIMINATION:
      return generateDoubleElimination(ranked, { protectedSeeding: input.protectedSeeding });

    case TournamentFormat.ROUND_ROBIN:
    case TournamentFormat.TEAM_LEAGUE:
      return generateRoundRobin(ranked, { homeAndAway: cfg.legsHomeAway });

    case TournamentFormat.LEAGUE:
      return generateRoundRobin(ranked, { homeAndAway: cfg.legsHomeAway ?? true });

    case TournamentFormat.GROUP_KNOCKOUT: {
      const groupCount = cfg.groupCount ?? Math.max(2, Math.ceil(ranked.length / 4));
      return generateGroupStage(ranked, groupCount);
      // knockout phase is generated later via generateKnockoutFromGroupStandings
      // once group standings are final (see draws.service.ts#advanceGroupStageToKnockout)
    }

    case TournamentFormat.BOX_LEAGUE:
      return generateBoxLeague(ranked, cfg.boxSize ?? 4);

    case TournamentFormat.LADDER_LEAGUE: {
      const ladder = initializeLadder(ranked);
      return {
        groups: [],
        rounds: [],
        matches: [],
        seededPositions: ladder.map((l) => ({ participantId: l.participantId, position: l.ladderRank })),
        isIncremental: true,
      };
    }

    case TournamentFormat.SWISS: {
      const standings = ranked.map((p) => ({ participantId: p.id, score: 0, rating: p.rating, opponentsFaced: [] }));
      const { matches, round } = generateSwissRound(standings, 1);
      return {
        groups: [],
        rounds: [round],
        matches,
        seededPositions: ranked.map((p, i) => ({ participantId: p.id, seed: p.seed ?? i + 1, position: i + 1 })),
        isIncremental: true,
      };
    }

    default:
      throw new Error(`Unsupported tournament format: ${input.format}`);
  }
}

export { generateSingleElimination, generateDoubleElimination, generateRoundRobin, generateGroupedRoundRobin };
export * from './types';
export * from './seeding';
export * from './swiss';
export * from './ladderBoxLeague';
export * from './groupKnockout';
