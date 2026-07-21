import { Router } from 'express';
import * as controller from './matches.controller';
import { authenticate } from '../../common/middleware/auth';
import { requireRole } from '../../common/middleware/rbac';
import { SCORING_ROLES } from '../../common/types/roles';

const router = Router();

router.get('/', controller.list);
router.get('/:matchId', controller.getById);
router.patch('/:matchId/score', authenticate, requireRole(...SCORING_ROLES), controller.updateScore);
router.post('/:matchId/complete', authenticate, requireRole(...SCORING_ROLES), controller.complete);
router.post('/:matchId/suspend', authenticate, requireRole(...SCORING_ROLES), controller.suspend);
router.post('/:matchId/resume', authenticate, requireRole(...SCORING_ROLES), controller.resume);
router.post('/:matchId/medical-timeout', authenticate, requireRole(...SCORING_ROLES), controller.medicalTimeout);
router.patch('/:matchId/officials', authenticate, requireRole(...SCORING_ROLES), controller.assignOfficials);

export default router;
