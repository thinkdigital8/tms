import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created, paginated } from '../../common/utils/apiResponse';
import { Organization } from '../../models/Organization';
import { authenticate } from '../../common/middleware/auth';
import { requireRole } from '../../common/middleware/rbac';
import { Role } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';
import { getPagination } from '../../common/utils/pagination';

/** CRUD for Clubs, Academies, Companies (corporate) and Federations — one collection, discriminated by orgType. */
const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter: Record<string, unknown> = {};
    if (req.query.orgType) filter.orgType = req.query.orgType;
    if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };

    const [items, total] = await Promise.all([
      Organization.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Organization.countDocuments(filter),
    ]);
    paginated(res, items, page, limit, total);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.params.id);
    if (!org) throw ApiError.notFound('Organization not found');
    ok(res, org);
  })
);

router.post(
  '/',
  authenticate,
  requireRole(Role.SUPER_ADMIN, Role.CLUB_ADMIN, Role.ACADEMY_ADMIN, Role.CORPORATE_ADMIN),
  asyncHandler(async (req, res) => {
    const org = await Organization.create({ ...req.body, admins: [req.user!.id] });
    created(res, org);
  })
);

router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.params.id);
    if (!org) throw ApiError.notFound('Organization not found');
    const isAdmin = org.admins.some((a) => a.toString() === req.user!.id);
    if (req.user!.role !== Role.SUPER_ADMIN && !isAdmin) throw ApiError.forbidden();
    Object.assign(org, req.body);
    await org.save();
    ok(res, org);
  })
);

router.post(
  '/:id/verify',
  authenticate,
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const org = await Organization.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (!org) throw ApiError.notFound('Organization not found');
    ok(res, org);
  })
);

export default router;
