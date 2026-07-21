import { Router } from 'express';
import * as controller from './tournaments.controller';
import { authenticate, optionalAuthenticate } from '../../common/middleware/auth';
import { requireRole } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import { createTournamentSchema } from './tournaments.validation';
import { TOURNAMENT_MANAGING_ROLES } from '../../common/types/roles';
import categoriesRouter from '../categories/categories.routes';
import registrationsRouter from '../registrations/registrations.routes';
import teamsRouter from '../teams/teams.routes';
import sponsorsRouter from '../sponsors/sponsors.routes';
import staffRouter from '../staff/staff.routes';
import drawsRouter from '../draws/draws.routes';
import schedulingRouter from '../scheduling/scheduling.routes';
import reportsRouter from '../reports/reports.routes';

const router = Router();

router.get('/', optionalAuthenticate, controller.list);
router.get('/slug/:slug', controller.getBySlug);
router.get('/:id', controller.getById);

router.post('/', authenticate, requireRole(...TOURNAMENT_MANAGING_ROLES), validate(createTournamentSchema), controller.create);
router.patch('/:id', authenticate, controller.update);
router.post('/:id/transition', authenticate, controller.transition);
router.delete('/:id', authenticate, controller.remove);

// Nested resources scoped to a tournament
router.use('/:tournamentId/categories', categoriesRouter);
router.use('/:tournamentId/registrations', registrationsRouter);
router.use('/:tournamentId/teams', teamsRouter);
router.use('/:tournamentId/sponsors', sponsorsRouter);
router.use('/:tournamentId/staff', staffRouter);
router.use('/:tournamentId/draws', drawsRouter);
router.use('/:tournamentId/schedule', schedulingRouter);
router.use('/:tournamentId/reports', reportsRouter);

export default router;
