import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/apiResponse';
import { TournamentStaff } from '../../models/TournamentStaff';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';

/** Organizers, referees, umpires and volunteers assigned to a tournament. */
const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER]),
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { tournament: req.params.tournamentId, status: 'active' };
    if (req.query.role) filter.role = req.query.role;
    const staff = await TournamentStaff.find(filter).populate('user', 'name email phone avatarUrl role');
    ok(res, staff);
  })
);

router.post(
  '/',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [TournamentStaffRole.OWNER]),
  asyncHandler(async (req, res) => {
    const staff = await TournamentStaff.create({
      tournament: req.params.tournamentId,
      user: req.body.user,
      role: req.body.role,
      assignedCourts: req.body.assignedCourts,
      assignedCategories: req.body.assignedCategories,
      invitedBy: req.user!.id,
    });
    created(res, staff);
  })
);

router.patch(
  '/:staffId/revoke',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [TournamentStaffRole.OWNER]),
  asyncHandler(async (req, res) => {
    const staff = await TournamentStaff.findOneAndUpdate(
      { _id: req.params.staffId, tournament: req.params.tournamentId },
      { status: 'revoked' },
      { new: true }
    );
    if (!staff) throw ApiError.notFound('Staff assignment not found');
    ok(res, staff);
  })
);

export default router;
