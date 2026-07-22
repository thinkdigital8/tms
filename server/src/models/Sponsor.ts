import { Schema, model, Types, Document } from 'mongoose';
import { SponsorTier } from '../common/types/enums';

export interface ISponsor extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  name: string;
  logoUrl?: string;
  website?: string;
  tier: SponsorTier;
  description?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const sponsorSchema = new Schema<ISponsor>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    name: { type: String, required: true },
    logoUrl: String,
    website: String,
    tier: { type: String, enum: Object.values(SponsorTier), default: SponsorTier.PARTNER },
    description: String,
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Sponsor = model<ISponsor>('Sponsor', sponsorSchema);
