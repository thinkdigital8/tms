import { Schema, model, Types, Document } from 'mongoose';

export type TeamMemberRole = 'captain' | 'vice_captain' | 'coach' | 'player' | 'substitute';

interface ITeamMember {
  user: Types.ObjectId;
  role: TeamMemberRole;
  jerseyNumber?: number;
  isActive: boolean;
}

export interface ITeam extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  name: string;
  logoUrl?: string;
  affiliation: 'club' | 'corporate' | 'state' | 'country' | 'independent';
  club?: Types.ObjectId;
  company?: Types.ObjectId;
  country?: string;
  members: ITeamMember[];
  isMixedTeam: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['captain', 'vice_captain', 'coach', 'player', 'substitute'], default: 'player' },
    jerseyNumber: Number,
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const teamSchema = new Schema<ITeam>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, index: true },
    name: { type: String, required: true },
    logoUrl: String,
    affiliation: { type: String, enum: ['club', 'corporate', 'state', 'country', 'independent'], default: 'independent' },
    club: { type: Schema.Types.ObjectId, ref: 'Organization' },
    company: { type: Schema.Types.ObjectId, ref: 'Organization' },
    country: String,
    members: [teamMemberSchema],
    isMixedTeam: { type: Boolean, default: false },
  },
  { timestamps: true }
);

teamSchema.index({ category: 1, name: 1 }, { unique: true });

export const Team = model<ITeam>('Team', teamSchema);
