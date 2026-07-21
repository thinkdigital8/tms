import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok, paginated } from '../../common/utils/apiResponse';
import { getPagination } from '../../common/utils/pagination';
import { Registration } from '../../models/Registration';
import { ApiError } from '../../common/utils/ApiError';
import * as service from './registrations.service';
import { Role } from '../../common/types/roles';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const filter: Record<string, unknown> = { tournament: req.params.tournamentId };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Registration.find(filter)
      .populate('player', 'name email avatarUrl country')
      .populate('team', 'name logoUrl')
      .populate('category', 'name')
      .sort({ registeredAt: 1 })
      .skip(skip)
      .limit(limit),
    Registration.countDocuments(filter),
  ]);
  paginated(res, items, page, limit, total);
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const registration = await service.registerEntry(req.user!, req.params.tournamentId, req.body);
  created(res, registration);
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const registration = await service.approveRegistration(req.params.registrationId, req.user!.id);
  ok(res, registration);
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const registration = await service.rejectRegistration(req.params.registrationId, req.user!.id, req.body.reason);
  ok(res, registration);
});

export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = [Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.ORGANIZER].includes(req.user!.role);
  const registration = await service.withdrawRegistration(req.params.registrationId, req.user!.id, isAdmin);
  ok(res, registration);
});

export const grantWildcard = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId, ...entryInput } = req.body;
  const registration = await service.grantWildcard(categoryId, entryInput, req.params.tournamentId, req.user!);
  created(res, registration);
});

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const registration = await service.checkIn(req.params.registrationId, req.body.method ?? 'manual');
  ok(res, registration);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const registration = await Registration.findOne({ _id: req.params.registrationId, tournament: req.params.tournamentId })
    .populate('player')
    .populate('team')
    .populate('category');
  if (!registration) throw ApiError.notFound('Registration not found');
  ok(res, registration);
});
