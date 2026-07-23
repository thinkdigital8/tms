import { Schema, model, Types, Document } from 'mongoose';

/**
 * Sport-specific extension of a User with role=player. Separated from User
 * because rating/ranking is per-sport (a player can have a Tennis rating and
 * a Padel rating simultaneously) while User holds sport-agnostic identity.
 */
export interface IPlayerProfile extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  sport: Types.ObjectId;
  rating: number;
  federationRanking?: number;
  clubRanking?: number;
  nationalRankingPoints: number;
  internationalRankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  currentStreak: number;
  club?: Types.ObjectId;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  medicalDeclaration?: {
    hasConditions: boolean;
    details?: string;
    acknowledgedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const playerProfileSchema = new Schema<IPlayerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sport: { type: Schema.Types.ObjectId, ref: 'Sport', required: true, index: true },
    rating: { type: Number, default: 1000 },
    federationRanking: Number,
    clubRanking: Number,
    nationalRankingPoints: { type: Number, default: 0 },
    internationalRankingPoints: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    club: { type: Schema.Types.ObjectId, ref: 'Organization' },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    medicalDeclaration: {
      hasConditions: { type: Boolean, default: false },
      details: String,
      acknowledgedAt: Date,
    },
  },
  { timestamps: true }
);

playerProfileSchema.index({ user: 1, sport: 1 }, { unique: true });
playerProfileSchema.index({ sport: 1, rating: -1 });

export const PlayerProfile = model<IPlayerProfile>('PlayerProfile', playerProfileSchema);
