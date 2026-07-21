import { Router } from 'express';
import * as controller from './registrations.controller';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';

const router = Router({ mergeParams: true });
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

router.get('/', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.list);
router.get('/:registrationId', authenticate, controller.getById);
router.post('/', authenticate, controller.register);
router.post('/wildcard', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.grantWildcard);
router.patch('/:registrationId/approve', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.approve);
router.patch('/:registrationId/reject', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES), controller.reject);
router.patch('/:registrationId/withdraw', authenticate, controller.withdraw);
router.patch('/:registrationId/check-in', authenticate, requireTournamentRole(TOURNAMENT_MANAGING_ROLES, [...MANAGE_STAFF_ROLES, TournamentStaffRole.VOLUNTEER]), controller.checkIn);

export default router;
