import { Schema, model, Types, Document } from 'mongoose';

interface IRescheduleEntry {
  fromCourt?: Types.ObjectId;
  toCourt?: Types.ObjectId;
  fromStart?: Date;
  toStart?: Date;
  reason?: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
}

/**
 * Scheduling info for a match, kept separate from Match so reschedule
 * history / conflict metadata don't bloat the hot-path match document that
 * live scoring repeatedly updates.
 */
export interface ISchedule extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  match: Types.ObjectId;
  court: Types.ObjectId;
  date: Date;
  startTime: Date;
  endTime: Date;
  estimatedDurationMinutes: number;
  minRestMinutesBeforeNext: number;
  status: 'scheduled' | 'delayed' | 'rain_delay' | 'in_progress' | 'completed' | 'cancelled';
  assignedBy: 'automatic' | 'manual';
  assignedByUser?: Types.ObjectId;
  rescheduleHistory: IRescheduleEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true, unique: true, index: true },
    court: { type: Schema.Types.ObjectId, ref: 'Court', required: true, index: true },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    estimatedDurationMinutes: { type: Number, default: 60 },
    minRestMinutesBeforeNext: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['scheduled', 'delayed', 'rain_delay', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    assignedBy: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
    assignedByUser: { type: Schema.Types.ObjectId, ref: 'User' },
    rescheduleHistory: [
      {
        fromCourt: { type: Schema.Types.ObjectId, ref: 'Court' },
        toCourt: { type: Schema.Types.ObjectId, ref: 'Court' },
        fromStart: Date,
        toStart: Date,
        reason: String,
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

scheduleSchema.index({ court: 1, startTime: 1, endTime: 1 });

export const Schedule = model<ISchedule>('Schedule', scheduleSchema);
