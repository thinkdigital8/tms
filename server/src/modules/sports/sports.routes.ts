import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/apiResponse';
import { Sport } from '../../models/Sport';
import { authenticate } from '../../common/middleware/auth';
import { requireRole } from '../../common/middleware/rbac';
import { Role } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';

const router = Router();

/**
 * Sports are data-driven (see models/Sport.ts) so the platform can onboard
 * a new racket sport by inserting a document — Pickleball, Badminton,
 * Tennis, Table Tennis, Squash, Padel ship as seed data, but nothing in the
 * tournament/draw/scoring engine hardcodes a sport name.
 */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sports = await Sport.find({ isActive: true }).sort({ name: 1 });
    ok(res, sports);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const sport = await Sport.findById(req.params.id);
    if (!sport) throw ApiError.notFound('Sport not found');
    ok(res, sport);
  })
);

router.post(
  '/',
  authenticate,
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const sport = await Sport.create(req.body);
    created(res, sport);
  })
);

router.patch(
  '/:id',
  authenticate,
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const sport = await Sport.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sport) throw ApiError.notFound('Sport not found');
    ok(res, sport);
  })
);

router.delete(
  '/:id',
  authenticate,
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const sport = await Sport.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!sport) throw ApiError.notFound('Sport not found');
    ok(res, sport);
  })
);

export default router;
