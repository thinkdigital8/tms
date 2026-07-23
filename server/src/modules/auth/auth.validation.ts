import { z } from 'zod';
import { Role } from '../../common/types/roles';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    phone: z.string().optional(),
    country: z.string().optional(),
    // Requesting a non-self-service role (e.g. super_admin) is silently downgraded
    // to Role.PLAYER by auth.service.ts's registerUser — this only widens what a
    // client is *allowed to ask for*, not what it's granted.
    role: z.nativeEnum(Role).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
});
