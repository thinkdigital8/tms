import { Schema, model, Types, Document } from 'mongoose';
import { TournamentStaffRole } from '../common/types/roles';

export interface ITournamentStaff extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  user: Types.ObjectId;
  role: TournamentStaffRole;
  status: 'active' | 'revoked';
  assignedCourts?: Types.ObjectId[];
  assignedCategories?: Types.ObjectId[];
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentStaffSchema = new Schema<ITournamentStaff>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: Object.values(TournamentStaffRole), required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    assignedCourts: [{ type: Schema.Types.ObjectId, ref: 'Court' }],
    assignedCategories: [{ type: Schema.Types.ObjectId, ref: 'TournamentCategory' }],
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

tournamentStaffSchema.index({ tournament: 1, user: 1, role: 1 }, { unique: true });

export const TournamentStaff = model<ITournamentStaff>('TournamentStaff', tournamentStaffSchema);
