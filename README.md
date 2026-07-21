# Tournament Management System (TMS)

A production-grade, API-first Tournament Management System for racket sports
— Pickleball, Badminton, Tennis, Table Tennis, Squash, Padel, and any future
sport, with no code changes required to add one.

Monorepo:

```
tms/
  server/   Node.js + Express + TypeScript + MongoDB (Mongoose) REST API
  client/   React 19 + TypeScript + Vite + Tailwind CSS v4 + Radix UI
```

## Why this architecture

- **Sport-agnostic core.** `Sport` is a database document (`server/src/models/Sport.ts`), not an enum baked into the code. Pickleball, Badminton, Tennis, Table Tennis, Squash and Padel ship as seed data (`server/src/seed/seed.ts`); onboarding a new racket sport is an insert, not a deploy.
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

### Backend

```bash
cd server
cp .env.example .env      # point MONGO_URI at your MongoDB instance
npm install
npm run seed               # seeds the 6 sports + a super-admin (admin@tms.dev / ChangeMe123!)
npm run dev                 # http://localhost:4000
```

### Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5173, proxies /api and /socket.io to :4000
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

**Fully implemented:** data model, RBAC, the 10-format bracket engine, draw persistence with round-by-round match progression (winner/loser auto-advance), registration lifecycle (approval/waitlist/wildcard/check-in), scheduling with conflict detection and rest-time enforcement, live scoring with Socket.IO broadcast, standings computation for round-robin/league/swiss/box formats, ranking-points ledger, CSV report export, and the core frontend flows (auth, tournament discovery, creation wizard, organizer manage panel, bracket/standings viewer, live scoring, rankings).

**Integration points left as clean seams, not fake code:** payment provider calls (Stripe/Razorpay — `payments.service.ts` documents exactly where to add the SDK call), notification delivery (email/SMS/WhatsApp/push — `notifications.service.ts`'s `dispatchToProvider` is the single place to wire a real provider; in-app notifications and Socket.IO delivery already work end-to-end today).

## Environment

See `server/.env.example` for all configuration (Mongo URI, JWT secrets, payment/notification provider keys).
