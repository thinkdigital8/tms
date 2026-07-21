import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/apiResponse';
import { Draw } from '../../models/Draw';
import { Match } from '../../models/Match';
import { Round } from '../../models/Round';
import { ApiError } from '../../common/utils/ApiError';
import * as service from './draws.service';

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const draw = await service.generateAndPersistDraw(req.user!, req.params.tournamentId, req.body.categoryId);
  created(res, draw);
});

export const getByCategory = asyncHandler(async (req: Request, res: Response) => {
  const draw = await Draw.findOne({ tournament: req.params.tournamentId, category: req.params.categoryId }).populate(
    'participants.registration'
  );
  if (!draw) throw ApiError.notFound('No draw generated yet for this category');

  const [rounds, matches] = await Promise.all([
    Round.find({ draw: draw._id }).sort({ roundNumber: 1 }),
    Match.find({ draw: draw._id })
      .sort({ matchNumber: 1 })
      .populate({ path: 'sideA.registration', populate: { path: 'player team', select: 'name logoUrl' } })
      .populate({ path: 'sideB.registration', populate: { path: 'player team', select: 'name logoUrl' } })
      .populate('court'),
  ]);

  ok(res, { draw, rounds, matches });
});

export const publish = asyncHandler(async (req: Request, res: Response) => {
  const draw = await service.publishDraw(req.user!, req.params.tournamentId, req.params.drawId);
  ok(res, draw);
});

export const swapSlots = asyncHandler(async (req: Request, res: Response) => {
  const { matchAId, sideAKey, matchBId, sideBKey } = req.body;
  const result = await service.swapDrawSlots(req.params.tournamentId, req.params.drawId, matchAId, sideAKey, matchBId, sideBKey);
  ok(res, result);
});
