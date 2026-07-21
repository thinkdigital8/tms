import { Payment } from '../../models/Payment';
import { Registration } from '../../models/Registration';
import { Tournament } from '../../models/Tournament';
import { TournamentCategory } from '../../models/TournamentCategory';
import { PaymentStatus } from '../../common/types/enums';
import { ApiError } from '../../common/utils/ApiError';
import { AuthUser } from '../../common/middleware/auth';

/**
 * Payment provider integration point. Only a manual/offline provider and a
 * pass-through "record an already-collected payment" path are implemented
 * here; wiring Stripe/Razorpay means calling their SDK to create a
 * PaymentIntent/Order in `initiatePayment` and verifying the signature/webhook
 * in `confirmPayment` before marking the Payment PAID — the schema and
 * status flow already support that without further model changes.
 */
export async function initiatePayment(user: AuthUser, tournamentId: string, registrationId: string) {
  const [tournament, registration] = await Promise.all([
    Tournament.findById(tournamentId),
    Registration.findById(registrationId),
  ]);
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (!registration) throw ApiError.notFound('Registration not found');

  const category = await TournamentCategory.findById(registration.category);
  const amount = category?.entryFee ?? tournament.baseFee;
  const taxAmount = round2((amount * tournament.taxPercent) / 100);
  const gstAmount = round2((amount * tournament.gstPercent) / 100);
  const totalAmount = round2(amount + taxAmount + gstAmount);

  const payment = await Payment.create({
    tournament: tournamentId,
    registration: registrationId,
    payer: user.id,
    amount,
    taxAmount,
    gstAmount,
    totalAmount,
    currency: category?.currency ?? tournament.currency,
    status: PaymentStatus.PENDING,
    provider: 'manual',
  });

  registration.payment = payment._id;
  await registration.save();

  return payment;
}

export async function confirmPayment(paymentId: string, providerPaymentId?: string, method?: string) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment not found');
  payment.status = PaymentStatus.PAID;
  payment.providerPaymentId = providerPaymentId;
  payment.method = method;
  payment.paidAt = new Date();
  await payment.save();
  return payment;
}

export async function refundPayment(paymentId: string, amount: number, reason?: string) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status !== PaymentStatus.PAID) throw ApiError.badRequest('Only paid payments can be refunded');

  payment.refundAmount = amount;
  payment.refundReason = reason;
  payment.status = amount >= payment.totalAmount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
  await payment.save();
  return payment;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
