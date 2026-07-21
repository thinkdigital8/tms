import { Router } from 'express';
import * as controller from './draws.controller';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';

const router = Router({ mergeParams: true });
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

router.get('/category/:categoryId', controller.getByCategory);
router.post('/generate', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.generate);
router.post('/:drawId/publish', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.publish);
router.patch('/:drawId/swap', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.swapSlots);

export default router;
