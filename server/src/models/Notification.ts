import { Schema, model, Types, Document } from 'mongoose';
import { NotificationChannel, NotificationType } from '../common/types/enums';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  tournament?: Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sentAt?: Date;
  readAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament' },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    channel: { type: String, enum: Object.values(NotificationChannel), required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    payload: Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'sent', 'failed', 'read'], default: 'pending' },
    sentAt: Date,
    readAt: Date,
    error: String,
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
