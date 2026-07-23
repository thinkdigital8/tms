import { Schema, model, Types, Document } from 'mongoose';
import { RegistrationEntryType, RegistrationStatus } from '../common/types/enums';

/**
 * A single entry into a tournament category, by an individual player or a
 * team. Waitlist / wildcard / lucky-loser are modeled as `entryType` +
 * `status` on this table (not separate collections) — they are states of one
 * registration lifecycle, and splitting them out would duplicate the schema
 * three times and require cross-table moves whenever a waitlisted player
 * is promoted or a lucky loser slot is granted.
 */
export interface IRegistration extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  player?: Types.ObjectId; // User ref, for individual/doubles entries
  partner?: Types.ObjectId; // doubles partner User ref
  team?: Types.ObjectId; // Team ref, for team events

  status: RegistrationStatus;
  entryType: RegistrationEntryType;
  seed?: number;

  waitlistPosition?: number;

  checkIn: {
    isCheckedIn: boolean;
    checkedInAt?: Date;
    method?: 'qr' | 'manual';
  };
  waiverSigned: boolean;
  waiverSignedAt?: Date;
  medicalDeclarationAcknowledged: boolean;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };

  payment?: Types.ObjectId;

  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;

  registeredBy: Types.ObjectId;
  registeredAt: Date;
  withdrawnAt?: Date;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<IRegistration>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, index: true },
    player: { type: Schema.Types.ObjectId, ref: 'User' },
    partner: { type: Schema.Types.ObjectId, ref: 'User' },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },

    status: { type: String, enum: Object.values(RegistrationStatus), default: RegistrationStatus.PENDING, index: true },
    entryType: { type: String, enum: Object.values(RegistrationEntryType), default: RegistrationEntryType.DIRECT },
    seed: Number,

    waitlistPosition: Number,

    checkIn: {
      isCheckedIn: { type: Boolean, default: false },
      checkedInAt: Date,
      method: { type: String, enum: ['qr', 'manual'] },
    },
    waiverSigned: { type: Boolean, default: false },
    waiverSignedAt: Date,
    medicalDeclarationAcknowledged: { type: Boolean, default: false },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },

    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,

    registeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now },
    withdrawnAt: Date,
    notes: String,
  },
  { timestamps: true }
);

registrationSchema.index({ category: 1, player: 1 }, { unique: true, partialFilterExpression: { player: { $type: 'objectId' } } });
registrationSchema.index({ category: 1, team: 1 }, { unique: true, partialFilterExpression: { team: { $type: 'objectId' } } });
registrationSchema.index({ category: 1, status: 1 });

export const Registration = model<IRegistration>('Registration', registrationSchema);
