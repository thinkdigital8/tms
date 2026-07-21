import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/apiResponse';
import * as service from './scheduling.service';
import { Schedule } from '../../models/Schedule';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { tournament: req.params.tournamentId };
  if (req.query.court) filter.court = req.query.court;
  if (req.query.date) {
    const day = new Date(req.query.date as string);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    filter.date = { $gte: day, $lt: next };
  }
  const schedules = await Schedule.find(filter).sort({ startTime: 1 }).populate('court').populate('match');
  ok(res, schedules);
});

export const autoSchedule = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.autoScheduleCategory(req.user!, req.params.tournamentId, req.body.categoryId, req.body);
  ok(res, result);
});

export const manualAssign = asyncHandler(async (req: Request, res: Response) => {
  const { matchId, courtId, startTime, durationMinutes } = req.body;
  const match = await service.manualAssign(req.user!, req.params.tournamentId, matchId, courtId, new Date(startTime), durationMinutes);
  ok(res, match);
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  const { matchId, newStartTime, newCourtId, reason } = req.body;
  const schedule = await service.reschedule(
    req.user!,
    req.params.tournamentId,
    matchId,
    newStartTime ? new Date(newStartTime) : undefined,
    newCourtId,
    reason
  );
  ok(res, schedule);
});

export const rainDelay = asyncHandler(async (req: Request, res: Response) => {
  const { courtId, delayMinutes, fromTime } = req.body;
  const result = await service.applyRainDelay(req.params.tournamentId, courtId, delayMinutes, new Date(fromTime));
  ok(res, result);
});
