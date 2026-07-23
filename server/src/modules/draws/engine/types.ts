import { BracketSide, MatchStage } from '../../../common/types/enums';

/** A participant fed into the bracket engine — sport/team agnostic. */
export interface EngineParticipant {
  id: string; // Registration._id (string) — the only ObjectId-shaped field the engine cares about
  seed?: number;
  rating?: number;
  clubId?: string;
  city?: string;
  country?: string;
}

export interface EngineSlot {
  participantId?: string;
  isBye?: boolean;
  /** unresolved placeholder, e.g. "Winner of M3" — filled in once source match completes */
  sourceMatchTempId?: string;
  sourceSlot?: 'winner' | 'loser';
  label?: string;
}

export interface EngineMatch {
  tempId: string;
  roundNumber: number;
  roundName: string;
  stage: MatchStage;
  bracketSide: BracketSide;
  groupId?: string;
  sideA: EngineSlot;
  sideB: EngineSlot;
  nextMatchTempId?: string;
  nextMatchSlot?: 'sideA' | 'sideB';
  loserNextMatchTempId?: string;
  loserNextMatchSlot?: 'sideA' | 'sideB';
  isBye: boolean;
}

export interface EngineRound {
  roundNumber: number;
  name: string;
  stage: MatchStage;
  groupId?: string;
}

export interface EngineGroup {
  groupId: string;
  name: string;
  participantCount: number;
}

export interface EngineDrawResult {
  groups: EngineGroup[];
  rounds: EngineRound[];
  matches: EngineMatch[];
  seededPositions: { participantId: string; seed?: number; position: number; groupId?: string }[];
  /** Swiss/ladder/box formats generate only their first round(s) up front; further rounds are generated on demand. */
  isIncremental?: boolean;
}
