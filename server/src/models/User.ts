import { Schema, model, Types, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role } from '../common/types/roles';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  avatarUrl?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  passportNumber?: string;
  city?: string;
  country?: string;
  club?: Types.ObjectId;
  academy?: Types.ObjectId;
  company?: Types.ObjectId;
  isActive: boolean;
  isEmailVerified: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), default: Role.PLAYER, index: true },
    avatarUrl: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    nationality: String,
    passportNumber: String,
    city: String,
    country: String,
    club: { type: Schema.Types.ObjectId, ref: 'Club' },
    academy: { type: Schema.Types.ObjectId, ref: 'Academy' },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

export const User = model<IUser>('User', userSchema);
