import { Schema, model, Types, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor?: Types.ObjectId;
  action: string; // e.g. "tournament.publish", "registration.approve"
  entityType: string;
  entityId?: Types.ObjectId;
  tournament?: Types.ObjectId;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: Schema.Types.ObjectId,
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', index: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
