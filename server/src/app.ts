import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './common/middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import sportRoutes from './modules/sports/sports.routes';
import organizationRoutes from './modules/organizations/organizations.routes';
import venueRoutes from './modules/venues/venues.routes';
import tournamentRoutes from './modules/tournaments/tournaments.routes';
import matchRoutes from './modules/matches/matches.routes';
import rankingRoutes from './modules/rankings/rankings.routes';
import paymentRoutes from './modules/payments/payments.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import publicRoutes from './modules/public/public.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv, time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/sports', sportRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/rankings', rankingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/public', publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
