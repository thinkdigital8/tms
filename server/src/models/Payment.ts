import { Schema, model, Types, Document } from 'mongoose';
import { PaymentStatus } from '../common/types/enums';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  tournament: Types.ObjectId;
  registration?: Types.ObjectId;
  payer: Types.ObjectId;
  amount: number;
  taxAmount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  status: PaymentStatus;
  provider: 'stripe' | 'razorpay' | 'manual' | 'offline';
  providerPaymentId?: string;
  method?: string;
  refundAmount?: number;
  refundReason?: string;
  invoiceUrl?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    registration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    payer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
    provider: { type: String, enum: ['stripe', 'razorpay', 'manual', 'offline'], default: 'manual' },
    providerPaymentId: String,
    method: String,
    refundAmount: Number,
    refundReason: String,
    invoiceUrl: String,
    paidAt: Date,
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
