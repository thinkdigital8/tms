import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { created, ok } from '../../common/utils/apiResponse';
import * as authService from './auth.service';
import { User } from '../../models/User';
import { ApiError } from '../../common/utils/ApiError';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.registerUser(req.body);
  created(res, tokens);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.loginUser(req.body.email, req.body.password);
  ok(res, tokens);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.refreshTokens(req.body.refreshToken);
  ok(res, tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.revokeAllSessions(req.user.id);
  ok(res, { success: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  ok(res, user);
});
