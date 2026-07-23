# Tournament Management System (TMS) — Frontend

A React frontend for a production-grade, API-first Tournament Management
System covering racket sports — Pickleball, Badminton, Tennis, Table
Tennis, Squash, Padel, Racquetball, Beach Tennis, Platform Tennis,
Frontenis, and any future sport the backend is configured with.

```
client/   React 19 + TypeScript + Vite + Tailwind CSS v4 + Radix UI
```

> The Node.js/Express/MongoDB backend for this project lives on the
> companion `claude/tms-backend` branch / pull request in this same
> repository. This frontend expects that API (proxied to `/api` and
> `/socket.io` in dev — see `client/vite.config.ts`).

## What's included

- **Auth** — login, register, session persistence (`src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/store/auth.ts`).
- **Tournament discovery & public pages** — browse tournaments, public tournament detail page (`src/pages/TournamentsList.tsx`, `src/pages/TournamentPublic.tsx`).
- **Multi-step tournament creation wizard** — sport, categories, format, schedule, registration rules (`src/pages/TournamentWizard.tsx`).
- **Organizer manage panel** — draws, registrations (approve/reject/waitlist/wildcard/check-in), reports (`src/pages/TournamentManage.tsx`).
- **Bracket & standings viewer** — renders all 10 supported formats (single/double elimination, round robin, league, swiss, ladder league, box league, group stage + knockout, team league/knockout) (`src/pages/BracketView.tsx`).
- **Live scoring** — real-time score updates via Socket.IO (`src/pages/LiveScoring.tsx`, `src/lib/socket.ts`).
- **Rankings & player profile** — ranking-points leaderboards, player profile page (`src/pages/Rankings.tsx`, `src/pages/Profile.tsx`).
- **Dark mode**, toast notifications, shared UI primitives (`src/store/theme.ts`, `src/store/toast.ts`, `src/components/ui`).

## Getting started

```bash
cd client
npm install
npm run dev     # http://localhost:5173, proxies /api and /socket.io to :4000
```

Point the dev proxy (`client/vite.config.ts`) at wherever the backend
(`claude/tms-backend` branch) is running — default expects it on
`http://localhost:4000`.

## Build

```bash
cd client
npm run build    # tsc -b && vite build
```
