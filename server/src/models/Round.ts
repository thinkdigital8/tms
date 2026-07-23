import { Schema, model, Types, Document } from 'mongoose';
import { MatchStage } from '../common/types/enums';

export interface IRound extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  category: Types.ObjectId;
  draw: Types.ObjectId;
  roundNumber: number;
  name: string; // "Round of 16", "Quarterfinal", "Group Round 2", "Swiss Round 3"
  stage: MatchStage;
  groupId?: string;
  scheduledDate?: Date;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roundSchema = new Schema<IRound>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'TournamentCategory', required: true, index: true },
    draw: { type: Schema.Types.ObjectId, ref: 'Draw', required: true, index: true },
    roundNumber: { type: Number, required: true },
    name: { type: String, required: true },
    stage: { type: String, enum: Object.values(MatchStage), required: true },
    groupId: String,
    scheduledDate: Date,
    isComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roundSchema.index({ category: 1, roundNumber: 1, groupId: 1 });

export const Round = model<IRound>('Round', roundSchema);
