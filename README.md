# Tournament Management System (TMS) — Backend

A production-grade, API-first Tournament Management System backend for
racket sports — Pickleball, Badminton, Tennis, Table Tennis, Squash, Padel,
Racquetball, Beach Tennis, Platform Tennis, Frontenis, and any future sport,
with no code changes required to add one.

```
server/   Node.js + Express + TypeScript + MongoDB (Mongoose) REST API
```

> The React frontend for this project lives on the companion
> `claude/tms-frontend` branch / pull request in this same repository.

## Why this architecture

- **Sport-agnostic core.** `Sport` is a database document (`server/src/models/Sport.ts`), not an enum baked into the code. Pickleball, Badminton, Tennis, Table Tennis, Squash, Padel, Racquetball, Beach Tennis, Platform Tennis and Frontenis ship as seed data (`server/src/seed/seed.ts`); onboarding a new racket sport is an insert, not a deploy.
- **A real bracket-generation engine, not a stub.** `server/src/modules/draws/engine/` implements Single Elimination, Double Elimination, Round Robin, League, Swiss, Ladder League, Box League, Group Stage + Knockout, and Team League/Knockout as pure, unit-testable functions, independent of Express/Mongo. Run `npx tsx src/modules/draws/engine/__selftest.ts` inside `server/` to verify bracket-size and elimination-count invariants for every format.
- **Normalized data model** for every entity in the spec (Tournament, Category, Registration, Team, Draw, Round, Match, Schedule, Result, Standing, Ranking, Payment, Sponsor, Venue/Court, Organization, AuditLog, …) — see `server/src/models/`. A few things are deliberately modeled as *states* on one table rather than duplicate tables (see "Design decisions" below).
- **RBAC with two layers**: coarse global roles (`Role` enum — super_admin, tournament_admin, organizer, club_admin, academy_admin, corporate_admin, referee, umpire, volunteer, player, spectator) and fine-grained per-tournament staff roles (`TournamentStaff` — owner/organizer/referee/umpire/volunteer/scorekeeper) so a "player" globally can be an "organizer" for one specific tournament.
- **Live updates** via Socket.IO: match score changes, schedule changes, and notifications broadcast to tournament/match/court rooms in real time (`server/src/sockets`).

## Design decisions worth knowing about

- **Waitlist / Wildcard / Lucky Loser are not separate tables.** They're `status`/`entryType` values on `Registration`. Splitting them into three near-identical collections would mean moving rows between tables whenever a waitlisted player is promoted — normalizing them onto one lifecycle avoids that.
- **Organizers / Referees / Umpires / Volunteers are not separate tables** either — they're rows in `TournamentStaff` with a `role` field, scoped to one tournament.
- **Club / Academy / Company / Federation share one `Organization` collection** (`orgType` discriminator) since they're structurally identical (name, contact, admins, verification).
- **`Match` (mutable, live-scoring hot path) is separate from `Result` (append-only, written once on completion)** so reporting/ranking pipelines have a stable source of truth independent of in-progress score edits. `Schedule` is likewise separate from `Match` so court/time reassignment history doesn't bloat the match document.
- **Double elimination** uses a generic alternating minor/major-round losers-bracket construction. It's mathematically correct (verified by the self-test: total matches = 2n-2, WB = n-1, LB = n-2) but is not guaranteed to match the exact "rematch-minimizing" seed tables some federations publish — documented in `doubleElimination.ts`.

## Getting started

```bash
cd server
cp .env.example .env      # point MONGO_URI at your MongoDB instance
npm install
npm run seed               # seeds the 10 sports + a super-admin (admin@tms.dev / ChangeMe123!)
npm run dev                 # http://localhost:4000
```

### Bracket engine self-test (no DB required)

```bash
cd server
npx tsx src/modules/draws/engine/__selftest.ts
```

## API surface (all under `/api`)

| Area | Base path |
|---|---|
| Auth | `/auth` (register, login, refresh, logout, me) |
| Users / player profiles | `/users` |
| Sports | `/sports` |
| Organizations (club/academy/company/federation) | `/organizations` |
| Venues & Courts | `/venues`, `/venues/:venueId/courts` |
| Tournaments | `/tournaments` (CRUD, status transitions) |
| Categories | `/tournaments/:tournamentId/categories` |
| Registrations (incl. approve/reject/waitlist/wildcard/check-in) | `/tournaments/:tournamentId/registrations` |
| Teams | `/tournaments/:tournamentId/teams` |
| Sponsors | `/tournaments/:tournamentId/sponsors` |
| Staff (organizers/referees/umpires/volunteers) | `/tournaments/:tournamentId/staff` |
| Draws (generate/publish/manual-edit) | `/tournaments/:tournamentId/draws` |
| Scheduling (auto-assign, manual, reschedule, rain delay) | `/tournaments/:tournamentId/schedule` |
| Reports (CSV/JSON export) | `/tournaments/:tournamentId/reports/:type` |
| Matches (live score, complete, walkover, suspend/resume, medical timeout) | `/matches` |
| Rankings | `/rankings` |
| Payments | `/payments` |
| Notifications | `/notifications` |
| Public tournament page data | `/public/tournaments/:slug` |

Every mutating route is gated by `authenticate` + either `requireRole` (global) or `requireTournamentRole` (global-or-staff-on-this-tournament) — see `server/src/common/middleware/rbac.ts`.

## What's implemented vs. scaffolded

**Fully implemented:** data model, RBAC, the 10-format bracket engine, draw persistence with round-by-round match progression (winner/loser auto-advance), registration lifecycle (approval/waitlist/wildcard/check-in), scheduling with conflict detection and rest-time enforcement, live scoring with Socket.IO broadcast, standings computation for round-robin/league/swiss/box formats, ranking-points ledger, CSV report export.

**Integration points left as clean seams, not fake code:** payment provider calls (Stripe/Razorpay — `payments.service.ts` documents exactly where to add the SDK call), notification delivery (email/SMS/WhatsApp/push — `notifications.service.ts`'s `dispatchToProvider` is the single place to wire a real provider; in-app notifications and Socket.IO delivery already work end-to-end today).

## Environment

See `server/.env.example` for all configuration (Mongo URI, JWT secrets, payment/notification provider keys).

## Deploying to Render

This branch includes a `render.yaml` Blueprint that provisions a Node web
service for the API. Render has no managed MongoDB, so the database is
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) (free M0
tier is enough to get started).

### 1. Create the Atlas database

1. Sign up / log in at Atlas, create a free (M0) cluster.
2. **Database Access** → add a database user with a password (not your
   Atlas login).
3. **Network Access** → add `0.0.0.0/0` (allow access from anywhere) so
   Render's dynamic IPs can connect — Render doesn't publish static
   outbound IPs on the free plan.
4. **Connect** → "Drivers" → copy the `mongodb+srv://...` connection
   string, substitute your database user's password, and append a
   database name, e.g. `.../tms?retryWrites=true&w=majority`.

### 2. Deploy the API on Render

1. In the Render dashboard: **New > Blueprint**, connect the
   `thinkdigital8/tms` repo, and select the `claude/tms-backend` branch.
   Render will read `render.yaml` and create the `tms-backend` web
   service (JWT secrets are auto-generated).
2. In the service's **Environment** tab, set `MONGO_URI` to the Atlas
   connection string from step 1.
3. Deploy the frontend (see the `claude/tms-frontend` branch's README)
   and note its Render URL, e.g. `https://tms-frontend.onrender.com`.
   Set `CLIENT_URL` on this service to that URL so CORS and Socket.IO
   accept requests from it, then redeploy.
4. Once live, seed the sports + a super-admin: open a shell on the
   Render service (**Shell** tab) and run `npm run seed`, or run it
   locally with `MONGO_URI` pointed at the same Atlas cluster.
5. Confirm it's up: `curl https://tms-backend.onrender.com/health`.

Without a manual Blueprint, create a **Web Service** by hand: root
directory `server`, build command `npm install && npm run build`, start
command `npm start`, health check path `/health`, and the env vars listed
in `render.yaml`.

Render's free-plan web services spin down after inactivity and take
~30-60s to wake on the next request — fine for evaluation, not for a
production tournament day. Upgrade the plan (or use a paid instance)
before relying on this for a live event.
