import { Types } from 'mongoose';
import { Schedule } from '../../models/Schedule';
import { Match } from '../../models/Match';
import { Court } from '../../models/Venue';
import { ApiError } from '../../common/utils/ApiError';
import { AuthUser } from '../../common/middleware/auth';
import { emitScheduleUpdate } from '../../sockets';
import { MatchStatus } from '../../common/types/enums';

export interface AutoScheduleOptions {
  courtIds: string[];
  date: string; // yyyy-mm-dd
  dailyStartTime: string; // "09:00"
  dailyEndTime: string; // "21:00"
  matchDurationMinutes: number;
  restMinutesBetweenMatches: number;
}

function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

/**
 * Greedy auto-scheduler: walks unscheduled matches in round order, assigns
 * the next available court/time slot such that (a) the court is free for the
 * full match duration and (b) neither participant is already booked within
 * `restMinutesBetweenMatches` of the proposed slot. Matches whose
 * participants aren't resolved yet (later knockout rounds) are skipped until
 * a prior round completes and reveals them.
 */
export async function autoScheduleCategory(user: AuthUser, tournamentId: string, categoryId: string, options: AutoScheduleOptions) {
  const matches = await Match.find({
    tournament: tournamentId,
    category: categoryId,
    status: 'scheduled',
  }).sort({ roundNumber: 1, matchNumber: 1 });

  const existingSchedules = await Schedule.find({ tournament: tournamentId }).lean();
  const courtBusy = new Map<string, { start: Date; end: Date }[]>();
  const participantBusy = new Map<string, { start: Date; end: Date }[]>();

  for (const s of existingSchedules) {
    pushBusy(courtBusy, String(s.court), s.startTime, s.endTime);
  }

  const dayStart = toDateTime(options.date, options.dailyStartTime);
  const dayEnd = toDateTime(options.date, options.dailyEndTime);
  const slotMs = options.matchDurationMinutes * 60000;
  const restMs = options.restMinutesBetweenMatches * 60000;

  const created: Types.ObjectId[] = [];
  const skipped: string[] = [];

  for (const match of matches) {
    const participantKeys = [match.sideA.registration, match.sideB.registration].filter(Boolean).map(String);
    if (!match.sideA.registration && !match.sideA.team) {
      skipped.push(String(match._id));
      continue;
    }
    if (!match.sideB.registration && !match.sideB.team) {
      skipped.push(String(match._id));
      continue;
    }

    let placed = false;
    for (let slotStart = new Date(dayStart); slotStart.getTime() + slotMs <= dayEnd.getTime(); slotStart = new Date(slotStart.getTime() + slotMs)) {
      const slotEnd = new Date(slotStart.getTime() + slotMs);

      for (const courtId of options.courtIds) {
        if (overlapsAny(courtBusy.get(courtId), slotStart, slotEnd)) continue;
        const participantConflict = participantKeys.some((pid) =>
          overlapsAny(participantBusy.get(pid), new Date(slotStart.getTime() - restMs), new Date(slotEnd.getTime() + restMs))
        );
        if (participantConflict) continue;

        await Schedule.create({
          tournament: tournamentId,
          match: match._id,
          court: courtId,
          date: new Date(options.date),
          startTime: slotStart,
          endTime: slotEnd,
          estimatedDurationMinutes: options.matchDurationMinutes,
          minRestMinutesBeforeNext: options.restMinutesBetweenMatches,
          status: 'scheduled',
          assignedBy: 'automatic',
          assignedByUser: user.id,
        });
        await Match.findByIdAndUpdate(match._id, { court: courtId, scheduledAt: slotStart, status: 'ready' });

        pushBusy(courtBusy, courtId, slotStart, slotEnd);
        participantKeys.forEach((pid) => pushBusy(participantBusy, pid, slotStart, slotEnd));

        created.push(match._id);
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed) skipped.push(String(match._id));
  }

  emitScheduleUpdate(tournamentId, { scheduledCount: created.length, skippedCount: skipped.length });
  return { scheduledMatchIds: created, skippedMatchIds: skipped };
}

function pushBusy(map: Map<string, { start: Date; end: Date }[]>, key: string, start: Date, end: Date) {
  const list = map.get(key) ?? [];
  list.push({ start, end });
  map.set(key, list);
}

function overlapsAny(ranges: { start: Date; end: Date }[] | undefined, start: Date, end: Date): boolean {
  if (!ranges) return false;
  return ranges.some((r) => start < r.end && end > r.start);
}

export async function manualAssign(
  user: AuthUser,
  tournamentId: string,
  matchId: string,
  courtId: string,
  startTime: Date,
  durationMinutes = 60
) {
  const match = await Match.findOne({ _id: matchId, tournament: tournamentId });
  if (!match) throw ApiError.notFound('Match not found');

  const court = await Court.findById(courtId);
  if (!court) throw ApiError.notFound('Court not found');

  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const conflict = await Schedule.findOne({
    court: courtId,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    match: { $ne: match._id },
  });
  if (conflict) throw ApiError.conflict('Court is already booked for an overlapping time slot');

  const existing = await Schedule.findOne({ match: match._id });
  if (existing) {
    existing.rescheduleHistory.push({
      fromCourt: existing.court,
      toCourt: court._id,
      fromStart: existing.startTime,
      toStart: startTime,
      changedBy: new Types.ObjectId(user.id),
      changedAt: new Date(),
    });
    existing.court = court._id;
    existing.startTime = startTime;
    existing.endTime = endTime;
    existing.assignedBy = 'manual';
    existing.assignedByUser = new Types.ObjectId(user.id);
    await existing.save();
  } else {
    await Schedule.create({
      tournament: tournamentId,
      match: match._id,
      court: court._id,
      date: startTime,
      startTime,
      endTime,
      estimatedDurationMinutes: durationMinutes,
      assignedBy: 'manual',
      assignedByUser: user.id,
      status: 'scheduled',
    });
  }

  match.court = court._id;
  match.scheduledAt = startTime;
  match.status = MatchStatus.READY;
  await match.save();

  emitScheduleUpdate(tournamentId, { matchId: match._id, courtId, startTime });
  return match;
}

export async function reschedule(user: AuthUser, tournamentId: string, matchId: string, newStartTime?: Date, newCourtId?: string, reason?: string) {
  const schedule = await Schedule.findOne({ tournament: tournamentId, match: matchId });
  if (!schedule) throw ApiError.notFound('This match has not been scheduled yet');

  schedule.rescheduleHistory.push({
    fromCourt: schedule.court,
    toCourt: newCourtId ? new Types.ObjectId(newCourtId) : schedule.court,
    fromStart: schedule.startTime,
    toStart: newStartTime ?? schedule.startTime,
    reason,
    changedBy: new Types.ObjectId(user.id),
    changedAt: new Date(),
  });

  const duration = schedule.endTime.getTime() - schedule.startTime.getTime();
  if (newStartTime) {
    schedule.startTime = newStartTime;
    schedule.endTime = new Date(newStartTime.getTime() + duration);
  }
  if (newCourtId) schedule.court = new Types.ObjectId(newCourtId);
  schedule.status = 'scheduled';
  await schedule.save();

  await Match.findByIdAndUpdate(matchId, {
    ...(newCourtId ? { court: newCourtId } : {}),
    ...(newStartTime ? { scheduledAt: newStartTime } : {}),
  });

  emitScheduleUpdate(tournamentId, { matchId, newStartTime, newCourtId, reason });
  return schedule;
}

/** Shifts every remaining scheduled match on a court forward by N minutes (rain delay). */
export async function applyRainDelay(tournamentId: string, courtId: string, delayMinutes: number, fromTime: Date) {
  const schedules = await Schedule.find({ tournament: tournamentId, court: courtId, startTime: { $gte: fromTime } });
  const delayMs = delayMinutes * 60000;

  for (const s of schedules) {
    s.rescheduleHistory.push({
      fromCourt: s.court,
      toCourt: s.court,
      fromStart: s.startTime,
      toStart: new Date(s.startTime.getTime() + delayMs),
      reason: 'Rain delay',
      changedBy: undefined as unknown as Types.ObjectId,
      changedAt: new Date(),
    });
    s.startTime = new Date(s.startTime.getTime() + delayMs);
    s.endTime = new Date(s.endTime.getTime() + delayMs);
    s.status = 'rain_delay';
    await s.save();
    await Match.findByIdAndUpdate(s.match, { scheduledAt: s.startTime });
  }

  emitScheduleUpdate(tournamentId, { courtId, delayMinutes, affected: schedules.length });
  return { affected: schedules.length };
}
