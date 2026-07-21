import { z } from 'zod';
import { TournamentType } from '../../common/types/enums';

export const createTournamentSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(200),
    description: z.string().optional(),
    sport: z.string(),
    type: z.nativeEnum(TournamentType),
    organization: z.string().optional(),
    venues: z.array(z.string()).optional(),
    primaryVenue: z.string().optional(),
    registrationOpenAt: z.coerce.date(),
    registrationCloseAt: z.coerce.date(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    currency: z.string().optional(),
    baseFee: z.number().min(0).optional(),
    taxPercent: z.number().min(0).max(100).optional(),
    gstPercent: z.number().min(0).max(100).optional(),
  }).passthrough(),
});

export const updateTournamentSchema = z.object({
  body: z.object({}).passthrough(),
});
