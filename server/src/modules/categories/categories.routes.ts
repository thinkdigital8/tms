import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/apiResponse';
import { TournamentCategory } from '../../models/TournamentCategory';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';

const router = Router({ mergeParams: true });
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories = await TournamentCategory.find({ tournament: req.params.tournamentId }).sort({ createdAt: 1 });
    ok(res, categories);
  })
);

router.get(
  '/:categoryId',
  asyncHandler(async (req, res) => {
    const category = await TournamentCategory.findOne({ _id: req.params.categoryId, tournament: req.params.tournamentId });
    if (!category) throw ApiError.notFound('Category not found');
    ok(res, category);
  })
);

router.post(
  '/',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const category = await TournamentCategory.create({ ...req.body, tournament: req.params.tournamentId });
    created(res, category);
  })
);

router.patch(
  '/:categoryId',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const category = await TournamentCategory.findOneAndUpdate(
      { _id: req.params.categoryId, tournament: req.params.tournamentId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) throw ApiError.notFound('Category not found');
    ok(res, category);
  })
);

router.delete(
  '/:categoryId',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const category = await TournamentCategory.findOne({ _id: req.params.categoryId, tournament: req.params.tournamentId });
    if (!category) throw ApiError.notFound('Category not found');
    if (category.status !== 'draft') {
      throw ApiError.badRequest('Only draft categories (no draw published) can be deleted');
    }
    await category.deleteOne();
    ok(res, { success: true });
  })
);

export default router;
