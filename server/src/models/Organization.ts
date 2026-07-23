import { Schema, model, Types, Document } from 'mongoose';

/**
 * Club, Academy, Company and Federation share an identical shape (identity +
 * contact + optional address), so they're modeled as one discriminated
 * collection to avoid four near-duplicate schemas while still supporting
 * per-type population via the `orgType` discriminator field.
 */
export type OrgType = 'club' | 'academy' | 'company' | 'federation';

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  orgType: OrgType;
  name: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  city?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  isNationalFederation?: boolean;
  isVerified: boolean;
  admins: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    orgType: { type: String, enum: ['club', 'academy', 'company', 'federation'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    logoUrl: String,
    description: String,
    country: String,
    city: String,
    address: String,
    contactEmail: String,
    contactPhone: String,
    website: String,
    isNationalFederation: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

organizationSchema.index({ orgType: 1, name: 1 });

export const Organization = model<IOrganization>('Organization', organizationSchema);
