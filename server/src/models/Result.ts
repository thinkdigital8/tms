import { Schema, model, Types, Document } from 'mongoose';

/**
 * Immutable finalized-result ledger, written once a Match transitions to a
 * terminal status. Kept separate from Match (which is mutable during live
 * scoring) so reporting/audit/ranking pipelines have a stable, append-only
 * source of truth.
 */
export interface IResult extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  match: Types.ObjectId;
  winnerRegistration?: Types.ObjectId;
  loserRegistration?: Types.ObjectId;
  winnerTeam?: Types.ObjectId;
  loserTeam?: Types.ObjectId;
  scoreSummary: string; // e.g. "6-4, 3-6, 10-7"
  winReason: string;
  rankingPointsAwarded: {
    winnerPoints: number;
    loserPoints: number;
  };
  recordedBy: Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IResult>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, index: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    winnerRegistration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    loserRegistration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    winnerTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
    loserTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
    scoreSummary: String,
    winReason: String,
    rankingPointsAwarded: {
      winnerPoints: { type: Number, default: 0 },
      loserPoints: { type: Number, default: 0 },
    },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Result = model<IResult>('Result', resultSchema);
