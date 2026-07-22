import { Schema, model, Types, Document } from 'mongoose';

/**
 * Sport is a pluggable configuration document rather than a hardcoded enum,
 * so new racket sports can be onboarded without a code deploy. `scoringConfig`
 * drives the generic scoring UI/engine (sets, points-per-set, win-by, etc).
 */
export interface ISport extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  iconUrl?: string;
  isTeamCapable: boolean;
  isDoublesCapable: boolean;
  scoringConfig: {
    setsToWin: number;
    pointsPerSet: number;
    winByMargin: number;
    tieBreakAt?: number;
    goldenPoint?: boolean;
    customRules?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sportSchema = new Schema<ISport>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    iconUrl: String,
    isTeamCapable: { type: Boolean, default: true },
    isDoublesCapable: { type: Boolean, default: true },
    scoringConfig: {
      setsToWin: { type: Number, default: 2 },
      pointsPerSet: { type: Number, default: 11 },
      winByMargin: { type: Number, default: 2 },
      tieBreakAt: Number,
      goldenPoint: { type: Boolean, default: false },
      customRules: String,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Sport = model<ISport>('Sport', sportSchema);
