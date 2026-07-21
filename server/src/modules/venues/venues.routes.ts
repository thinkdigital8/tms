import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created, paginated } from '../../common/utils/apiResponse';
import { Venue, Court } from '../../models/Venue';
import { authenticate } from '../../common/middleware/auth';
import { requireRole } from '../../common/middleware/rbac';
import { Role, TOURNAMENT_MANAGING_ROLES } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';
import { getPagination } from '../../common/utils/pagination';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter: Record<string, unknown> = {};
    if (req.query.city) filter.city = { $regex: String(req.query.city), $options: 'i' };
    if (req.query.country) filter.country = req.query.country;

    const [items, total] = await Promise.all([
      Venue.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Venue.countDocuments(filter),
    ]);
    paginated(res, items, page, limit, total);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const venue = await Venue.findById(req.params.id);
    if (!venue) throw ApiError.notFound('Venue not found');
    const courts = await Court.find({ venue: venue._id }).populate('sport');
    ok(res, { ...venue.toObject(), courts });
  })
);

router.post(
  '/',
  authenticate,
  requireRole(...TOURNAMENT_MANAGING_ROLES),
  asyncHandler(async (req, res) => {
    const venue = await Venue.create(req.body);
    created(res, venue);
  })
);

router.patch(
  '/:id',
  authenticate,
  requireRole(...TOURNAMENT_MANAGING_ROLES),
  asyncHandler(async (req, res) => {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!venue) throw ApiError.notFound('Venue not found');
    ok(res, venue);
  })
);

router.delete(
  '/:id',
  authenticate,
  requireRole(Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN),
  asyncHandler(async (req, res) => {
    await Court.deleteMany({ venue: req.params.id });
    await Venue.findByIdAndDelete(req.params.id);
    ok(res, { success: true });
  })
);

// ---- Courts (sub-resource of a venue) ----

router.get(
  '/:venueId/courts',
  asyncHandler(async (req, res) => {
    const courts = await Court.find({ venue: req.params.venueId }).populate('sport');
    ok(res, courts);
  })
);

router.post(
  '/:venueId/courts',
  authenticate,
  requireRole(...TOURNAMENT_MANAGING_ROLES),
  asyncHandler(async (req, res) => {
    const court = await Court.create({ ...req.body, venue: req.params.venueId });
    created(res, court);
  })
);

router.patch(
  '/:venueId/courts/:courtId',
  authenticate,
  requireRole(...TOURNAMENT_MANAGING_ROLES),
  asyncHandler(async (req, res) => {
    const court = await Court.findOneAndUpdate(
      { _id: req.params.courtId, venue: req.params.venueId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!court) throw ApiError.notFound('Court not found');
    ok(res, court);
  })
);

router.delete(
  '/:venueId/courts/:courtId',
  authenticate,
  requireRole(...TOURNAMENT_MANAGING_ROLES),
  asyncHandler(async (req, res) => {
    await Court.findOneAndUpdate({ _id: req.params.courtId, venue: req.params.venueId }, { isActive: false });
    ok(res, { success: true });
  })
);

export default router;
