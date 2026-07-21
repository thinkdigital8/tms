import { Router } from 'express';
import * as controller from './scheduling.controller';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';

const router = Router({ mergeParams: true });
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

router.get('/', controller.list);
router.post('/auto', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.autoSchedule);
router.post('/assign', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.manualAssign);
router.post('/reschedule', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.reschedule);
router.post('/rain-delay', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.rainDelay);

export default router;
