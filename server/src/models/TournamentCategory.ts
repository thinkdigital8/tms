import { Schema, model, Types, Document } from 'mongoose';
import { GenderCategory, SkillLevel, SeedingMethod, TournamentFormat } from '../common/types/enums';

interface ISeedingConfig {
  method: SeedingMethod;
  seededPlayersCount: number;
  avoidSameClub: boolean;
  avoidSameCity: boolean;
  avoidSameCountry: boolean;
  protectedSeeding: boolean;
}

interface IPrize {
  position: string; // "Winner", "Runner-up", "Semi-finalist", ...
  cashAmount?: number;
  currency?: string;
  description?: string;
}

export interface ITournamentCategory extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  name: string;
  isTeamEvent: boolean;
  isDoubles: boolean;

  ageGroup?: string; // e.g. "U12", "35+", "Open"
  minAge?: number;
  maxAge?: number;
  gender: GenderCategory;
  skillLevel: SkillLevel;
  minRating?: number;
  maxRating?: number;

  format: TournamentFormat;
  formatConfig: {
    groupCount?: number;
    playersPerGroup?: number;
    qualifiersPerGroup?: number;
    swissRounds?: number;
    boxSize?: number;
    legsHomeAway?: boolean;
    thirdPlacePlayoff?: boolean;
  };

  entryFee?: number;
  currency?: string;
  maxParticipants: number;
  minParticipants: number;

  seeding: ISeedingConfig;
  prizes: IPrize[];

  registrationCloseAt?: Date;
  status: 'draft' | 'open' | 'closed' | 'draw_published' | 'in_progress' | 'completed';
  drawPublishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const tournamentCategorySchema = new Schema<ITournamentCategory>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    name: { type: String, required: true },
    isTeamEvent: { type: Boolean, default: false },
    isDoubles: { type: Boolean, default: false },

    ageGroup: String,
    minAge: Number,
    maxAge: Number,
    gender: { type: String, enum: Object.values(GenderCategory), default: GenderCategory.OPEN },
    skillLevel: { type: String, enum: Object.values(SkillLevel), default: SkillLevel.OPEN },
    minRating: Number,
    maxRating: Number,

    format: { type: String, enum: Object.values(TournamentFormat), required: true },
    formatConfig: {
      groupCount: Number,
      playersPerGroup: Number,
      qualifiersPerGroup: Number,
      swissRounds: Number,
      boxSize: Number,
      legsHomeAway: Boolean,
      thirdPlacePlayoff: { type: Boolean, default: false },
    },

    entryFee: Number,
    currency: String,
    maxParticipants: { type: Number, required: true },
    minParticipants: { type: Number, default: 4 },

    seeding: {
      method: { type: String, enum: Object.values(SeedingMethod), default: SeedingMethod.RANDOM },
      seededPlayersCount: { type: Number, default: 0 },
      avoidSameClub: { type: Boolean, default: false },
      avoidSameCity: { type: Boolean, default: false },
      avoidSameCountry: { type: Boolean, default: false },
      protectedSeeding: { type: Boolean, default: false },
    },
    prizes: [
      {
        position: String,
        cashAmount: Number,
        currency: String,
        description: String,
      },
    ],

    registrationCloseAt: Date,
    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'draw_published', 'in_progress', 'completed'],
      default: 'draft',
    },
    drawPublishedAt: Date,
  },
  { timestamps: true }
);

tournamentCategorySchema.index({ tournament: 1, name: 1 }, { unique: true });

export const TournamentCategory = model<ITournamentCategory>('TournamentCategory', tournamentCategorySchema);
