import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ok } from '../../common/utils/apiResponse';
import { authenticate } from '../../common/middleware/auth';
import { requireTournamentRole } from '../../common/middleware/rbac';
import { TOURNAMENT_MANAGING_ROLES, TournamentStaffRole } from '../../common/types/roles';
import * as service from './reports.service';

const router = Router({ mergeParams: true });
const MANAGE_STAFF_ROLES = [TournamentStaffRole.OWNER, TournamentStaffRole.ORGANIZER];

const REPORTS: Record<string, (tournamentId: string) => Promise<Record<string, unknown>[] | { summary: unknown; transactions: Record<string, unknown>[] }>> = {
  registrations: service.registrationReport,
  revenue: service.revenueReport,
  attendance: service.attendanceReport,
  players: service.playerReport,
  categories: service.categoryReport,
  'court-usage': service.courtUsageReport,
  sponsors: service.sponsorReport,
  financial: service.financialReport,
  results: service.matchResultsReport,
};

router.get(
  '/:reportType',
  authenticate,
  requireTournamentRole(TOURNAMENT_MANAGING_ROLES, MANAGE_STAFF_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const generator = REPORTS[req.params.reportType];
    if (!generator) return res.status(404).json({ success: false, message: 'Unknown report type' });

    const data = await generator(req.params.tournamentId);
    const rows = Array.isArray(data) ? data : data.transactions;
    const format = (req.query.format as string) ?? 'json';

    if (format === 'csv') {
      const csv = service.toCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.reportType}.csv"`);
      return res.send(csv);
    }

    ok(res, data);
  })
);

export default router;
