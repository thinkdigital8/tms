/**
 * Seeds the six supported racket sports and a super-admin account for local
 * development. Run with `npm run seed` (requires MONGO_URI reachable).
 * Idempotent — safe to re-run.
 */
import { connectDB, disconnectDB } from '../config/db';
import { Sport } from '../models/Sport';
import { User } from '../models/User';
import { Role } from '../common/types/roles';

const SPORTS = [
  { name: 'Pickleball', slug: 'pickleball', scoringConfig: { setsToWin: 2, pointsPerSet: 11, winByMargin: 2 }, isDoublesCapable: true },
  { name: 'Badminton', slug: 'badminton', scoringConfig: { setsToWin: 2, pointsPerSet: 21, winByMargin: 2 }, isDoublesCapable: true },
  { name: 'Tennis', slug: 'tennis', scoringConfig: { setsToWin: 2, pointsPerSet: 6, winByMargin: 2, tieBreakAt: 6 }, isDoublesCapable: true },
  { name: 'Table Tennis', slug: 'table-tennis', scoringConfig: { setsToWin: 3, pointsPerSet: 11, winByMargin: 2 }, isDoublesCapable: true },
  { name: 'Squash', slug: 'squash', scoringConfig: { setsToWin: 3, pointsPerSet: 11, winByMargin: 2 }, isDoublesCapable: false },
  { name: 'Padel', slug: 'padel', scoringConfig: { setsToWin: 2, pointsPerSet: 6, winByMargin: 2, tieBreakAt: 6 }, isDoublesCapable: true, isTeamCapable: true },
];

async function main() {
  await connectDB();

  for (const sport of SPORTS) {
    await Sport.findOneAndUpdate({ slug: sport.slug }, sport, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`[seed] upserted sport: ${sport.name}`);
  }

  const adminEmail = 'admin@tms.dev';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'Platform Super Admin',
      email: adminEmail,
      passwordHash: 'ChangeMe123!',
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
    });
    console.log(`[seed] created super admin: ${adminEmail} / ChangeMe123! (change immediately)`);
  } else {
    console.log('[seed] super admin already exists, skipping');
  }

  await disconnectDB();
  console.log('[seed] done');
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
