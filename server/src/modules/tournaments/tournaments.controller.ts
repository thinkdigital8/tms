import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok, paginated } from '../../common/utils/apiResponse';
import { getPagination } from '../../common/utils/pagination';
import { Tournament } from '../../models/Tournament';
import { ApiError } from '../../common/utils/ApiError';
import * as service from './tournaments.service';
import { TournamentStatus } from '../../common/types/enums';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const filter = service.buildTournamentFilter({
    type: req.query.type as string,
    status: req.query.status as string,
    sport: req.query.sport as string,
    search: req.query.q as string,
    country: req.query.country as string,
    from: req.query.from as string,
    to: req.query.to as string,
    organizer: req.query.organizer as string,
    publishedOnly: req.query.mine !== 'true',
  });

  const sortOption: Record<string, 1 | -1> =
    req.query.sort === 'popular' ? { viewCount: -1 } : req.query.sort === 'recent' ? { createdAt: -1 } : { startDate: 1 };

  const [items, total] = await Promise.all([
    Tournament.find(filter).populate('sport', 'name slug').sort(sortOption).skip(skip).limit(limit),
    Tournament.countDocuments(filter),
  ]);
  paginated(res, items, page, limit, total);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await Tournament.findById(req.params.id)
    .populate('sport')
    .populate('venues')
    .populate('primaryVenue')
    .populate('sponsors')
    .populate('organizer', 'name email avatarUrl');
  if (!tournament) throw ApiError.notFound('Tournament not found');
  ok(res, tournament);
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await Tournament.findOne({ slug: req.params.slug })
    .populate('sport')
    .populate('venues')
    .populate('primaryVenue')
    .populate('sponsors')
    .populate('organizer', 'name email avatarUrl');
  if (!tournament) throw ApiError.notFound('Tournament not found');
  ok(res, tournament);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await service.createTournament(req.user!, req.body);
  created(res, tournament);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await service.updateTournament(req.user!, req.params.id, req.body);
  ok(res, tournament);
});

export const transition = asyncHandler(async (req: Request, res: Response) => {
  const nextStatus = req.body.status as TournamentStatus;
  const tournament = await service.transitionStatus(req.user!, req.params.id, nextStatus);
  ok(res, tournament);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.assertCanManage(req.user!, req.params.id);
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (tournament.status !== TournamentStatus.DRAFT) {
    throw ApiError.badRequest('Only draft tournaments can be deleted; cancel it instead');
  }
  await tournament.deleteOne();
  ok(res, { success: true });
});
