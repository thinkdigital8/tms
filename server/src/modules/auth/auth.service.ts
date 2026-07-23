import { User } from '../../models/User';
import { ApiError } from '../../common/utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/tokens';
import { Role } from '../../common/types/roles';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: Role;
  country?: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Only a subset of roles may self-register; staff roles (referee/umpire/volunteer)
  // and admin-tier roles above ORGANIZER are granted by admins, not chosen at signup.
  const selfServiceRoles = [Role.PLAYER, Role.SPECTATOR, Role.ORGANIZER];
  const role = input.role && selfServiceRoles.includes(input.role) ? input.role : Role.PLAYER;

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.password,
    phone: input.phone,
    role,
    country: input.country,
  });

  return issueTokens(user.id, user.role, user.email, user.tokenVersion);
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  const valid = await user.comparePassword(password);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  return issueTokens(user.id, user.role, user.email, user.tokenVersion);
}

export async function refreshTokens(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Refresh token no longer valid');
  }

  return issueTokens(user.id, user.role, user.email, user.tokenVersion);
}

export async function revokeAllSessions(userId: string) {
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
}

/**
 * Self-service upgrade for a player/spectator who wants to organize
 * tournaments, so that choice isn't only available at signup time. Only
 * allowed from the two lowest-privilege roles — anyone already holding a
 * staff or admin-tier role uses the admin-only PATCH /users/:id/role
 * instead. Re-issues tokens since role is embedded in the access token.
 */
export async function becomeOrganizer(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const upgradeableRoles = [Role.PLAYER, Role.SPECTATOR];
  if (!upgradeableRoles.includes(user.role)) {
    throw ApiError.badRequest('Only player or spectator accounts can self-upgrade to organizer');
  }

  user.role = Role.ORGANIZER;
  await user.save();

  return issueTokens(user.id, user.role, user.email, user.tokenVersion);
}

function issueTokens(userId: string, role: Role, email: string, tokenVersion: number) {
  const accessToken = signAccessToken({ sub: userId, role, email });
  const refreshToken = signRefreshToken({ sub: userId, tokenVersion });
  return { accessToken, refreshToken };
}
