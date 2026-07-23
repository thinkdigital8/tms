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

Set `VITE_API_URL` (see `client/.env.example`) before building for
production — it's baked into the bundle at build time, so it must be set
wherever the build runs, not just on the deployed server. Leave it unset
for local dev; the Vite proxy handles `/api` and `/socket.io` instead.

## Deploying to Render

This branch includes a `render.yaml` Blueprint that provisions a static
site for this frontend.

1. In the Render dashboard: **New > Blueprint**, connect the
   `thinkdigital8/tms` repo, and select the `claude/tms-frontend` branch.
   Render will read `render.yaml` and create the `tms-frontend` static
   site.
2. Deploy the backend first (see the `claude/tms-backend` branch's
   README) and note its Render URL, e.g.
   `https://tms-backend.onrender.com`.
3. In the `tms-frontend` service's **Environment** tab, set
   `VITE_API_URL` to that backend URL (no trailing slash), then trigger a
   manual deploy so the build picks it up.
4. Once the frontend is live, go back to the backend service and set its
   `CLIENT_URL` env var to this frontend's Render URL (e.g.
   `https://tms-frontend.onrender.com`) so CORS and Socket.IO allow it,
   then redeploy the backend.

Without a manual Blueprint, create a **Static Site** by hand: root
directory `client`, build command `npm install && npm run build`, publish
directory `dist`, and add a rewrite rule `/*` → `/index.html` so
client-side routing (React Router) works on refresh/deep links.
