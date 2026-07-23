import { Schema, model, Types, Document } from 'mongoose';

export type RankingScope = 'club' | 'national' | 'international';

/**
 * Append-only ranking-points ledger. Current ranking is derived by summing
 * (or windowing) entries per player+sport+scope; keeping it a ledger instead
 * of a mutable running total preserves an audit trail per tournament result.
 */
export interface IRankingEntry extends Document {
  _id: Types.ObjectId;
  player: Types.ObjectId;
  sport: Types.ObjectId;
  scope: RankingScope;
  tournament?: Types.ObjectId;
  category?: Types.ObjectId;
  points: number;
  reason: string;
  effectiveDate: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rankingEntrySchema = new Schema<IRankingEntry>(
  {
    player: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sport: { type: Schema.Types.ObjectId, ref: 'Sport', required: true, index: true },
    scope: { type: String, enum: ['club', 'national', 'international'], required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament' },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory' },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    effectiveDate: { type: Date, default: Date.now },
    expiresAt: Date,
  },
  { timestamps: true }
);

rankingEntrySchema.index({ player: 1, sport: 1, scope: 1 });

export const RankingEntry = model<IRankingEntry>('RankingEntry', rankingEntrySchema);
