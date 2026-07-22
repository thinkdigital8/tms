import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, created } from '../../common/utils/apiResponse';
import { Sponsor } from '../../models/Sponsor';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';
import { ApiError } from '../../common/utils/ApiError';

const router = Router({ mergeParams: true });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sponsors = await Sponsor.find({ tournament: req.params.tournamentId }).sort({ tier: 1, displayOrder: 1 });
    ok(res, sponsors);
  })
);

router.post(
  '/',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER]),
  asyncHandler(async (req, res) => {
    const sponsor = await Sponsor.create({ ...req.body, tournament: req.params.tournamentId });
    created(res, sponsor);
  })
);

router.patch(
  '/:sponsorId',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER]),
  asyncHandler(async (req, res) => {
    const sponsor = await Sponsor.findOneAndUpdate(
      { _id: req.params.sponsorId, tournament: req.params.tournamentId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!sponsor) throw ApiError.notFound('Sponsor not found');
    ok(res, sponsor);
  })
);

router.delete(
  '/:sponsorId',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER]),
  asyncHandler(async (req, res) => {
    await Sponsor.findOneAndDelete({ _id: req.params.sponsorId, tournament: req.params.tournamentId });
    ok(res, { success: true });
  })
);

export default router;
