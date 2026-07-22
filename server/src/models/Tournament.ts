import { Schema, model, Types, Document } from 'mongoose';
import { TournamentStatus, TournamentType } from '../common/types/enums';

interface IContact {
  name?: string;
  email?: string;
  phone?: string;
}

interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

interface IRegistrationRules {
  minPlayers?: number;
  maxPlayers?: number;
  waitlistEnabled: boolean;
  wildcardSlots: number;
  luckyLoserSlots: number;
  lateEntryAllowed: boolean;
  approvalMode: 'automatic' | 'manual';
  checkInRequired: boolean;
  qrCheckIn: boolean;
  digitalWaiverRequired: boolean;
  medicalDeclarationRequired: boolean;
  emergencyContactRequired: boolean;
}

interface IEligibility {
  /** club/academy/company scoping used when type is club/academy/corporate */
  clubs: Types.ObjectId[];
  academies: Types.ObjectId[];
  companies: Types.ObjectId[];
  invitationOnly: boolean;
  countriesAllowed: string[];
  requiresFederationApproval: boolean;
  requiresPassportInfo: boolean;
}

export interface ITournament extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  sport: Types.ObjectId;
  type: TournamentType;
  status: TournamentStatus;

  bannerUrl?: string;
  logoUrl?: string;
  galleryUrls: string[];

  organizer: Types.ObjectId;
  organization?: Types.ObjectId;
  sponsors: Types.ObjectId[];

  venues: Types.ObjectId[];
  primaryVenue?: Types.ObjectId;

  registrationOpenAt: Date;
  registrationCloseAt: Date;
  startDate: Date;
  endDate: Date;
  checkInTime?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;

  currency: string;
  baseFee: number;
  taxPercent: number;
  gstPercent: number;
  refundPolicy?: string;
  termsAndConditions?: string;

  contact: IContact;
  website?: string;
  liveStreamUrl?: string;
  social: ISocialLinks;

  registrationRules: IRegistrationRules;
  eligibility: IEligibility;

  federation?: Types.ObjectId;
  nationalRankingEligible: boolean;
  internationalRankingEligible: boolean;
  allowedCurrencies: string[];

  isPublished: boolean;
  isFeatured: boolean;
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    sport: { type: Schema.Types.ObjectId, ref: 'Sport', required: true, index: true },
    type: { type: String, enum: Object.values(TournamentType), required: true, index: true },
    status: { type: String, enum: Object.values(TournamentStatus), default: TournamentStatus.DRAFT, index: true },

    bannerUrl: String,
    logoUrl: String,
    galleryUrls: [String],

    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    sponsors: [{ type: Schema.Types.ObjectId, ref: 'Sponsor' }],

    venues: [{ type: Schema.Types.ObjectId, ref: 'Venue' }],
    primaryVenue: { type: Schema.Types.ObjectId, ref: 'Venue' },

    registrationOpenAt: { type: Date, required: true },
    registrationCloseAt: { type: Date, required: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    checkInTime: String,
    dailyStartTime: String,
    dailyEndTime: String,

    currency: { type: String, default: 'USD' },
    baseFee: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    refundPolicy: String,
    termsAndConditions: String,

    contact: {
      name: String,
      email: String,
      phone: String,
    },
    website: String,
    liveStreamUrl: String,
    social: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
      website: String,
    },

    registrationRules: {
      minPlayers: Number,
      maxPlayers: Number,
      waitlistEnabled: { type: Boolean, default: true },
      wildcardSlots: { type: Number, default: 0 },
      luckyLoserSlots: { type: Number, default: 0 },
      lateEntryAllowed: { type: Boolean, default: false },
      approvalMode: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
      checkInRequired: { type: Boolean, default: true },
      qrCheckIn: { type: Boolean, default: true },
      digitalWaiverRequired: { type: Boolean, default: false },
      medicalDeclarationRequired: { type: Boolean, default: false },
      emergencyContactRequired: { type: Boolean, default: true },
    },

    eligibility: {
      clubs: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
      academies: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
      companies: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
      invitationOnly: { type: Boolean, default: false },
      countriesAllowed: [String],
      requiresFederationApproval: { type: Boolean, default: false },
      requiresPassportInfo: { type: Boolean, default: false },
    },

    federation: { type: Schema.Types.ObjectId, ref: 'Organization' },
    nationalRankingEligible: { type: Boolean, default: false },
    internationalRankingEligible: { type: Boolean, default: false },
    allowedCurrencies: [String],

    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

tournamentSchema.index({ name: 'text', description: 'text' });
tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.index({ type: 1, status: 1 });

export const Tournament = model<ITournament>('Tournament', tournamentSchema);
