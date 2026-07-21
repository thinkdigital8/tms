import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, paginated } from '../../common/utils/apiResponse';
import { getPagination } from '../../common/utils/pagination';
import { Match } from '../../models/Match';
import * as service from './matches.service';
import { emitMatchUpdate } from '../../sockets';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const filter: Record<string, unknown> = {};
  if (req.query.tournament) filter.tournament = req.query.tournament;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.court) filter.court = req.query.court;
  if (req.query.live === 'true') filter.status = 'in_progress';

  const [items, total] = await Promise.all([
    Match.find(filter)
      .sort({ scheduledAt: 1, matchNumber: 1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'sideA.registration', populate: 'player team' })
      .populate({ path: 'sideB.registration', populate: 'player team' })
      .populate('court'),
    Match.countDocuments(filter),
  ]);
  paginated(res, items, page, limit, total);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.getMatch(req.params.matchId);
  ok(res, match);
});

export const updateScore = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.recordSetScore(req.params.matchId, req.body.sets, req.user!);
  emitMatchUpdate(match);
  ok(res, match);
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.completeMatch(req.params.matchId, req.body.winner, req.body.winReason ?? 'normal', req.user!);
  emitMatchUpdate(match);
  ok(res, match);
});

export const suspend = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.suspendMatch(req.params.matchId, req.body.reason);
  emitMatchUpdate(match);
  ok(res, match);
});

export const resume = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.resumeMatch(req.params.matchId);
  emitMatchUpdate(match);
  ok(res, match);
});

export const medicalTimeout = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.logMedicalTimeout(req.params.matchId, req.body.side);
  emitMatchUpdate(match);
  ok(res, match);
});

export const assignOfficials = asyncHandler(async (req: Request, res: Response) => {
  const match = await service.assignOfficials(req.params.matchId, req.body.umpire, req.body.referee);
  ok(res, match);
});
