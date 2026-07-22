import { Schema, model, Types, Document } from 'mongoose';
import { BracketSide, MatchStage, MatchStatus } from '../common/types/enums';

interface ISetScore {
  setNumber: number;
  sideA: number;
  sideB: number;
  tieBreak?: { sideA: number; sideB: number };
}

interface IParticipantRef {
  registration?: Types.ObjectId;
  team?: Types.ObjectId;
  label?: string; // "Winner of M12", "Bye", "TBD" when not yet resolved
}

export interface IMatch extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  draw: Types.ObjectId;
  round: Types.ObjectId;
  matchNumber: number;
  stage: MatchStage;
  bracketSide: BracketSide;
  groupId?: string;

  sideA: IParticipantRef;
  sideB: IParticipantRef;

  nextMatch?: Types.ObjectId;
  nextMatchSlot?: 'sideA' | 'sideB';
  loserNextMatch?: Types.ObjectId;
  loserNextMatchSlot?: 'sideA' | 'sideB';

  status: MatchStatus;
  sets: ISetScore[];
  winner?: 'sideA' | 'sideB';
  winReason?: 'normal' | 'walkover' | 'retirement' | 'default' | 'bye';

  isBye: boolean;
  bestOf: number;

  scheduledAt?: Date;
  court?: Types.ObjectId;
  umpire?: Types.ObjectId;
  referee?: Types.ObjectId;

  startedAt?: Date;
  completedAt?: Date;
  suspendedAt?: Date;
  suspendReason?: string;

  medicalTimeouts: { side: 'sideA' | 'sideB'; at: Date; durationSeconds?: number }[];
  videoReviewRequests: { side: 'sideA' | 'sideB'; at: Date; outcome?: string }[];

  liveScoreEnabled: boolean;
  lastUpdatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const participantRefSchema = new Schema<IParticipantRef>(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    label: String,
  },
  { _id: false }
);

const matchSchema = new Schema<IMatch>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, index: true },
    draw: { type: Schema.Types.ObjectId, ref: 'Draw', required: true, index: true },
    round: { type: Schema.Types.ObjectId, ref: 'Round', required: true, index: true },
    matchNumber: { type: Number, required: true },
    stage: { type: String, enum: Object.values(MatchStage), required: true },
    bracketSide: { type: String, enum: Object.values(BracketSide), default: BracketSide.NONE },
    groupId: String,

    sideA: participantRefSchema,
    sideB: participantRefSchema,

    nextMatch: { type: Schema.Types.ObjectId, ref: 'Match' },
    nextMatchSlot: { type: String, enum: ['sideA', 'sideB'] },
    loserNextMatch: { type: Schema.Types.ObjectId, ref: 'Match' },
    loserNextMatchSlot: { type: String, enum: ['sideA', 'sideB'] },

    status: { type: String, enum: Object.values(MatchStatus), default: MatchStatus.SCHEDULED, index: true },
    sets: [
      {
        setNumber: Number,
        sideA: Number,
        sideB: Number,
        tieBreak: { sideA: Number, sideB: Number },
      },
    ],
    winner: { type: String, enum: ['sideA', 'sideB'] },
    winReason: { type: String, enum: ['normal', 'walkover', 'retirement', 'default', 'bye'] },

    isBye: { type: Boolean, default: false },
    bestOf: { type: Number, default: 3 },

    scheduledAt: Date,
    court: { type: Schema.Types.ObjectId, ref: 'Court' },
    umpire: { type: Schema.Types.ObjectId, ref: 'User' },
    referee: { type: Schema.Types.ObjectId, ref: 'User' },

    startedAt: Date,
    completedAt: Date,
    suspendedAt: Date,
    suspendReason: String,

    medicalTimeouts: [{ side: { type: String, enum: ['sideA', 'sideB'] }, at: Date, durationSeconds: Number }],
    videoReviewRequests: [{ side: { type: String, enum: ['sideA', 'sideB'] }, at: Date, outcome: String }],

    liveScoreEnabled: { type: Boolean, default: false },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

matchSchema.index({ category: 1, matchNumber: 1 }, { unique: true });
matchSchema.index({ status: 1, scheduledAt: 1 });
matchSchema.index({ court: 1, scheduledAt: 1 });

export const Match = model<IMatch>('Match', matchSchema);
