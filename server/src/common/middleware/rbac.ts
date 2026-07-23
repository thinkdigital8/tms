import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { Role } from '../types/roles';

/** Restricts a route to a fixed set of global roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires one of roles: ${roles.join(', ')}`));
    }
    next();
  };
}

/**
 * Allows access if the user holds one of the given global roles OR has been
 * granted one of the given staff roles on the tournament referenced by
 * `req.params[tournamentIdParam]`. Falls through to next() on success.
 * Import is deferred to avoid circular module init between rbac and models.
 */
export function requireTournamentRole(
  globalRoles: Role[],
  staffRoles: string[],
  tournamentIdParam = 'tournamentId'
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());

    if (globalRoles.includes(req.user.role)) return next();

    const tournamentId = req.params[tournamentIdParam] ?? req.body?.tournament;
    if (!tournamentId) return next(ApiError.forbidden());

    const { TournamentStaff } = await import('../../models/TournamentStaff');
    const staff = await TournamentStaff.findOne({
      tournament: tournamentId,
      user: req.user.id,
      role: { $in: staffRoles },
      status: 'active',
    }).lean();

    if (!staff) {
      return next(ApiError.forbidden('You do not have staff access to this tournament'));
    }
    next();
  };
}

/** Restricts to the resource owner (by `ownerField` on req.resource) or listed global roles. */
export function requireSelfOrRole(userIdGetter: (req: Request) => string | undefined, ...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.includes(req.user.role)) return next();
    const ownerId = userIdGetter(req);
    if (ownerId && ownerId === req.user.id) return next();
    return next(ApiError.forbidden());
  };
}
