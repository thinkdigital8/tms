import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/ApiError';
import { Tournament } from '../../models/Tournament';
import { TournamentCategory } from '../../models/TournamentCategory';
import { Sponsor } from '../../models/Sponsor';
import { Registration } from '../../models/Registration';
import { Team } from '../../models/Team';
import { Match } from '../../models/Match';
import { Standing } from '../../models/Standing';

/**
 * Single aggregate endpoint powering the public tournament page: banner,
 * venue, schedule snapshot, categories, sponsors, live matches and
 * standings — everything the marketing/spectator page needs in one
 * round trip, no auth required (published tournaments only).
 */
const router = Router();

router.get(
  '/tournaments/:slug',
  asyncHandler(async (req, res) => {
    const tournament = await Tournament.findOne({ slug: req.params.slug, isPublished: true })
      .populate('sport')
      .populate('venues')
      .populate('primaryVenue')
      .populate('sponsors')
      .populate('organizer', 'name avatarUrl');
    if (!tournament) throw ApiError.notFound('Tournament not found');

    const categories = await TournamentCategory.find({ tournament: tournament._id });
    const sponsors = await Sponsor.find({ tournament: tournament._id }).sort({ tier: 1, displayOrder: 1 });
    const registrationCounts = await Registration.aggregate([
      { $match: { tournament: tournament._id, status: { $in: ['approved', 'checked_in'] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const liveMatches = await Match.find({ tournament: tournament._id, status: 'in_progress' })
      .populate({ path: 'sideA.registration', populate: 'player team' })
      .populate({ path: 'sideB.registration', populate: 'player team' })
      .populate('court');
    const upcomingMatches = await Match.find({ tournament: tournament._id, status: { $in: ['scheduled', 'ready'] } })
      .sort({ scheduledAt: 1 })
      .limit(20)
      .populate({ path: 'sideA.registration', populate: 'player team' })
      .populate({ path: 'sideB.registration', populate: 'player team' })
      .populate('court');

    ok(res, {
      tournament,
      categories,
      sponsors,
      registrationCounts,
      liveMatches,
      upcomingMatches,
    });
  })
);

router.get(
  '/tournaments/:slug/standings/:categoryId',
  asyncHandler(async (req, res) => {
    const standings = await Standing.find({ category: req.params.categoryId })
      .sort({ groupId: 1, rank: 1 })
      .populate({ path: 'registration', populate: 'player team' })
      .populate('team');
    ok(res, standings);
  })
);

router.get(
  '/tournaments/:slug/teams/:categoryId',
  asyncHandler(async (req, res) => {
    const teams = await Team.find({ category: req.params.categoryId }).populate('members.user', 'name avatarUrl');
    ok(res, teams);
  })
);

export default router;
