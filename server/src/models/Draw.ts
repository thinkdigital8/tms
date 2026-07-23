import { Schema, model, Types, Document } from 'mongoose';
import { SeedingMethod, TournamentFormat } from '../common/types/enums';

interface IDrawParticipant {
  registration: Types.ObjectId;
  seed?: number;
  position: number; // slot index in the initial draw
  groupId?: string; // for round robin / swiss / group stage / box league
}

export interface IDraw extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  format: TournamentFormat;
  seedingMethod: SeedingMethod;
  participants: IDrawParticipant[];
  groups: { groupId: string; name: string; participantCount: number }[];
  status: 'draft' | 'published' | 'locked';
  generatedBy: Types.ObjectId;
  generatedAt: Date;
  publishedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const drawSchema = new Schema<IDraw>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, unique: true, index: true },
    format: { type: String, enum: Object.values(TournamentFormat), required: true },
    seedingMethod: { type: String, enum: Object.values(SeedingMethod), required: true },
    participants: [
      {
        registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
        seed: Number,
        position: { type: Number, required: true },
        groupId: String,
      },
    ],
    groups: [
      {
        groupId: String,
        name: String,
        participantCount: Number,
      },
    ],
    status: { type: String, enum: ['draft', 'published', 'locked'], default: 'draft' },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now },
    publishedAt: Date,
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Draw = model<IDraw>('Draw', drawSchema);
