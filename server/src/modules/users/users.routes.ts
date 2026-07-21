import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, paginated } from '../../common/utils/apiResponse';
import { getPagination } from '../../common/utils/pagination';
import { User } from '../../models/User';
import { PlayerProfile } from '../../models/PlayerProfile';
import { authenticate } from '../../common/middleware/auth';
import { requireRole } from '../../common/middleware/rbac';
import { Role } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.ORGANIZER),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter: Record<string, unknown> = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) filter.$or = [{ name: { $regex: req.query.q, $options: 'i' } }, { email: { $regex: req.query.q, $options: 'i' } }];

    const [items, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
      User.countDocuments(filter),
    ]);
    paginated(res, items, page, limit, total);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound('User not found');
    const profiles = await PlayerProfile.find({ user: user._id }).populate('sport');
    ok(res, { ...user.toObject(), playerProfiles: profiles });
  })
);

router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const allowedFields = ['name', 'phone', 'avatarUrl', 'dateOfBirth', 'gender', 'nationality', 'passportNumber', 'city', 'country', 'club', 'academy', 'company'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) if (key in req.body) updates[key] = req.body[key];

    const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true, runValidators: true });
    ok(res, user);
  })
);

router.patch(
  '/:id/role',
  authenticate,
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    if (!user) throw ApiError.notFound('User not found');
    ok(res, user);
  })
);

router.put(
  '/me/player-profile/:sportId',
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await PlayerProfile.findOneAndUpdate(
      { user: req.user!.id, sport: req.params.sportId },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    ok(res, profile);
  })
);

export default router;
