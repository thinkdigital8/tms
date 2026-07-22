import { Schema, model, Types, Document } from 'mongoose';

export interface IVenue extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  geo?: { lat: number; lng: number };
  amenities: string[];
  contactPhone?: string;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const venueSchema = new Schema<IVenue>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    country: { type: String, required: true },
    postalCode: String,
    geo: { lat: Number, lng: Number },
    amenities: [String],
    contactPhone: String,
    imageUrls: [String],
  },
  { timestamps: true }
);

export const Venue = model<IVenue>('Venue', venueSchema);

export interface ICourt extends Document {
  _id: Types.ObjectId;
  venue: Types.ObjectId;
  name: string;
  sport: Types.ObjectId;
  surfaceType?: string;
  isIndoor: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const courtSchema = new Schema<ICourt>(
  {
    venue: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    name: { type: String, required: true },
    sport: { type: Schema.Types.ObjectId, ref: 'Sport', required: true },
    surfaceType: String,
    isIndoor: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true }
);

courtSchema.index({ venue: 1, name: 1 }, { unique: true });

export const Court = model<ICourt>('Court', courtSchema);
