import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok, paginated } from '../../common/utils/apiResponse';
import { getPagination } from '../../common/utils/pagination';
import { Payment } from '../../models/Payment';
import { authenticate } from '../../common/middleware/auth';
import { requireRole, requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';
import * as service from './payments.service';

const router = Router();
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

router.get(
  '/tournament/:tournamentId',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { tournament: req.params.tournamentId };
    const [items, total] = await Promise.all([
      Payment.find(filter).populate('payer', 'name email').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
    ]);
    paginated(res, items, page, limit, total);
  })
);

router.post(
  '/tournament/:tournamentId/initiate',
  authenticate,
  asyncHandler(async (req, res) => {
    const payment = await service.initiatePayment(req.user!, req.params.tournamentId, req.body.registrationId);
    created(res, payment);
  })
);

router.post(
  '/:paymentId/confirm',
  authenticate,
  asyncHandler(async (req, res) => {
    const payment = await service.confirmPayment(req.params.paymentId, req.body.providerPaymentId, req.body.method);
    ok(res, payment);
  })
);

router.post(
  '/:paymentId/refund',
  authenticate,
  requireRole(...TOURNAMENT_MANAGING_ROLES),
  asyncHandler(async (req, res) => {
    const payment = await service.refundPayment(req.params.paymentId, req.body.amount, req.body.reason);
    ok(res, payment);
  })
);

export default router;
