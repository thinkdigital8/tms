import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok, paginated } from '../../common/utils/apiResponse';
import { getPagination } from '../../common/utils/pagination';
import { Notification } from '../../models/Notification';
import { authenticate } from '../../common/middleware/auth';
import * as service from './notifications.service';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter: Record<string, unknown> = { recipient: req.user!.id };
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);
    paginated(res, items, page, limit, total);
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await service.markRead(req.params.id, req.user!.id);
    ok(res, { success: true });
  })
);

export default router;
