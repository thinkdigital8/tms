import { Schema, model, Types, Document } from 'mongoose';

/**
 * A standings-table row for round robin / league / swiss / box-league /
 * ladder formats. One row per participant per group per category; recomputed
 * as results land in that group.
 */
export interface IStanding extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  groupId?: string;
  registration?: Types.ObjectId;
  team?: Types.ObjectId;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  setsFor: number;
  setsAgainst: number;
  pointsFor: number;
  pointsAgainst: number;
  matchPoints: number; // league/swiss points (e.g. win=3, draw=1)
  buchholzScore?: number; // swiss tiebreak
  ladderRank?: number;
  rank: number;
  form: ('W' | 'L' | 'D')[];
  updatedAt: Date;
  createdAt: Date;
}

const standingSchema = new Schema<IStanding>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, index: true },
    groupId: String,
    registration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    drawn: { type: Number, default: 0 },
    setsFor: { type: Number, default: 0 },
    setsAgainst: { type: Number, default: 0 },
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    matchPoints: { type: Number, default: 0 },
    buchholzScore: Number,
    ladderRank: Number,
    rank: { type: Number, default: 0 },
    form: [{ type: String, enum: ['W', 'L', 'D'] }],
  },
  { timestamps: true }
);

standingSchema.index({ category: 1, groupId: 1, registration: 1 }, { unique: true, partialFilterExpression: { registration: { $type: 'objectId' } } });
standingSchema.index({ category: 1, groupId: 1, team: 1 }, { unique: true, partialFilterExpression: { team: { $type: 'objectId' } } });

export const Standing = model<IStanding>('Standing', standingSchema);
