import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/apiResponse';
import { Team } from '../../models/Team';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';

const router = Router({ mergeParams: true });
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { tournament: req.params.tournamentId };
    if (req.query.category) filter.category = req.query.category;
    const teams = await Team.find(filter).populate('members.user', 'name email avatarUrl');
    ok(res, teams);
  })
);

router.get(
  '/:teamId',
  asyncHandler(async (req, res) => {
    const team = await Team.findOne({ _id: req.params.teamId, tournament: req.params.tournamentId }).populate('members.user', 'name email avatarUrl');
    if (!team) throw ApiError.notFound('Team not found');
    ok(res, team);
  })
);

function isCaptainOrManager(team: InstanceType<typeof Team>, userId: string) {
  return team.members.some((m) => String(m.user) === userId && ['captain', 'vice_captain'].includes(m.role));
}

router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const team = await Team.create({
      ...req.body,
      tournament: req.params.tournamentId,
      members: req.body.members?.length ? req.body.members : [{ user: req.user!.id, role: 'captain', isActive: true }],
    });
    created(res, team);
  })
);

router.patch(
  '/:teamId',
  authenticate,
  asyncHandler(async (req, res) => {
    const team = await Team.findOne({ _id: req.params.teamId, tournament: req.params.tournamentId });
    if (!team) throw ApiError.notFound('Team not found');

    const canManage = isCaptainOrManager(team, req.user!.id);
    if (!canManage) {
      // fall back to tournament staff check
      const { TournamentStaff } = await import('../../models/TournamentStaff');
      const staff = await TournamentStaff.findOne({
        tournament: req.params.tournamentId,
        user: req.user!.id,
        role: { $in: MANAGE_STAFF_ROLES },
        status: 'active',
      });
      if (!staff && !TOURNAMENT_MANAGING_ROLES.includes(req.user!.role)) throw ApiError.forbidden();
    }

    Object.assign(team, req.body);
    await team.save();
    ok(res, team);
  })
);

router.post(
  '/:teamId/members',
  authenticate,
  asyncHandler(async (req, res) => {
    const team = await Team.findOne({ _id: req.params.teamId, tournament: req.params.tournamentId });
    if (!team) throw ApiError.notFound('Team not found');
    team.members.push(req.body);
    await team.save();
    ok(res, team);
  })
);

router.delete(
  '/:teamId/members/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const team = await Team.findOne({ _id: req.params.teamId, tournament: req.params.tournamentId });
    if (!team) throw ApiError.notFound('Team not found');
    team.members = team.members.filter((m) => String(m.user) !== req.params.userId);
    await team.save();
    ok(res, team);
  })
);

export default router;
