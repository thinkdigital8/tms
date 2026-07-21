import { Router } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/apiResponse';
import { RankingEntry } from '../../models/Ranking';
import { PlayerProfile } from '../../models/PlayerProfile';

const router = Router();

/** Leaderboard: sums each player's ranking points ledger, grouped by sport + scope. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sport = req.query.sport as string;
    const scope = (req.query.scope as string) ?? 'national';
    if (!sport) return ok(res, []);

    const leaderboard = await RankingEntry.aggregate([
      { $match: { sport: new Types.ObjectId(sport), scope } },
      { $group: { _id: '$player', totalPoints: { $sum: '$points' } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 100 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      {
        $project: {
          _id: 0,
          playerId: '$_id',
          name: '$player.name',
          country: '$player.country',
          avatarUrl: '$player.avatarUrl',
          totalPoints: 1,
        },
      },
    ]);

    ok(res, leaderboard);
  })
);

router.get(
  '/player/:userId',
  asyncHandler(async (req, res) => {
    const [entries, profiles] = await Promise.all([
      RankingEntry.find({ player: req.params.userId }).populate('sport tournament').sort({ effectiveDate: -1 }),
      PlayerProfile.find({ user: req.params.userId }).populate('sport'),
    ]);
    ok(res, { entries, profiles });
  })
);

export default router;
