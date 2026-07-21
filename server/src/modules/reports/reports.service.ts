import { Parser } from 'json2csv';
import { Types } from 'mongoose';
import { Registration } from '../../models/Registration';
import { Payment } from '../../models/Payment';
import { Match } from '../../models/Match';
import { Schedule } from '../../models/Schedule';
import { TournamentCategory } from '../../models/TournamentCategory';
import { Sponsor } from '../../models/Sponsor';

export async function registrationReport(tournamentId: string) {
  const regs = await Registration.find({ tournament: tournamentId })
    .populate('player', 'name email phone country')
    .populate('team', 'name')
    .populate('category', 'name')
    .lean();

  return regs.map((r) => ({
    id: String(r._id),
    category: (r.category as unknown as { name?: string })?.name,
    entrant: (r.player as unknown as { name?: string })?.name ?? (r.team as unknown as { name?: string })?.name,
    email: (r.player as unknown as { email?: string })?.email,
    status: r.status,
    entryType: r.entryType,
    seed: r.seed,
    checkedIn: r.checkIn?.isCheckedIn,
    registeredAt: r.registeredAt,
  }));
}

export async function revenueReport(tournamentId: string) {
  const payments = await Payment.find({ tournament: tournamentId }).populate('payer', 'name email').lean();
  return payments.map((p) => ({
    id: String(p._id),
    payer: (p.payer as unknown as { name?: string })?.name,
    email: (p.payer as unknown as { email?: string })?.email,
    amount: p.amount,
    tax: p.taxAmount,
    gst: p.gstAmount,
    total: p.totalAmount,
    currency: p.currency,
    status: p.status,
    provider: p.provider,
    paidAt: p.paidAt,
  }));
}

export async function financialReport(tournamentId: string) {
  const rows = await revenueReport(tournamentId);
  const summary = rows.reduce(
    (acc, r) => {
      if (r.status === 'paid') acc.totalCollected += r.total;
      if (r.status === 'refunded' || r.status === 'partially_refunded') acc.totalRefunded += r.total;
      acc.totalTax += r.tax;
      acc.totalGst += r.gst;
      return acc;
    },
    { totalCollected: 0, totalRefunded: 0, totalTax: 0, totalGst: 0 }
  );
  return { summary, transactions: rows };
}

export async function attendanceReport(tournamentId: string) {
  const regs = await Registration.find({ tournament: tournamentId, 'checkIn.isCheckedIn': true })
    .populate('player', 'name email')
    .populate('category', 'name')
    .lean();
  return regs.map((r) => ({
    entrant: (r.player as unknown as { name?: string })?.name,
    category: (r.category as unknown as { name?: string })?.name,
    checkedInAt: r.checkIn?.checkedInAt,
    method: r.checkIn?.method,
  }));
}

export async function playerReport(tournamentId: string) {
  return registrationReport(tournamentId); // player-level view is the registration list, sport-agnostic
}

export async function categoryReport(tournamentId: string) {
  const categories = await TournamentCategory.find({ tournament: tournamentId }).lean();
  const counts = await Registration.aggregate([
    { $match: { tournament: new Types.ObjectId(tournamentId) } },
    { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 } } },
  ]);
  return categories.map((c) => ({
    category: c.name,
    format: c.format,
    maxParticipants: c.maxParticipants,
    approved: counts.find((x) => String(x._id.category) === String(c._id) && x._id.status === 'approved')?.count ?? 0,
    pending: counts.find((x) => String(x._id.category) === String(c._id) && x._id.status === 'pending')?.count ?? 0,
    waitlisted: counts.find((x) => String(x._id.category) === String(c._id) && x._id.status === 'waitlisted')?.count ?? 0,
    status: c.status,
  }));
}

export async function courtUsageReport(tournamentId: string) {
  const schedules = await Schedule.find({ tournament: tournamentId }).populate('court', 'name').lean();
  const byCourt = new Map<string, { court: string; matches: number; minutesBooked: number }>();
  for (const s of schedules) {
    const courtName = (s.court as unknown as { name?: string })?.name ?? 'Unknown';
    const entry = byCourt.get(courtName) ?? { court: courtName, matches: 0, minutesBooked: 0 };
    entry.matches += 1;
    entry.minutesBooked += (s.endTime.getTime() - s.startTime.getTime()) / 60000;
    byCourt.set(courtName, entry);
  }
  return [...byCourt.values()];
}

export async function sponsorReport(tournamentId: string) {
  const sponsors = await Sponsor.find({ tournament: tournamentId }).lean();
  return sponsors.map((s) => ({ name: s.name, tier: s.tier, website: s.website }));
}

export async function matchResultsReport(tournamentId: string) {
  const matches = await Match.find({ tournament: tournamentId, status: 'completed' })
    .populate({ path: 'sideA.registration', populate: 'player team' })
    .populate({ path: 'sideB.registration', populate: 'player team' })
    .populate('round', 'name')
    .lean();
  return matches.map((m) => ({
    matchNumber: m.matchNumber,
    round: (m.round as unknown as { name?: string })?.name,
    sideA: nameOf(m.sideA),
    sideB: nameOf(m.sideB),
    winner: m.winner,
    score: m.sets?.map((s) => `${s.sideA}-${s.sideB}`).join(', '),
  }));
}

function nameOf(side: { registration?: unknown; label?: string }): string {
  const reg = side.registration as { player?: { name?: string }; team?: { name?: string } } | undefined;
  return reg?.player?.name ?? reg?.team?.name ?? side.label ?? 'TBD';
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const parser = new Parser({ fields: Object.keys(rows[0]) });
  return parser.parse(rows);
}
