# AGENTS.md

## Repo Shape
- This is not a single npm workspace: run commands inside `backend/`, `frontend/`, or `dashboard/`; each has its own `package-lock.json`.
- `backend/` is the production app and the only project covered by GitHub Actions CI/CD.
- `frontend/` is an Astro public site; `dashboard/` is a Vite React admin UI.

## Backend
- Use npm in `backend/`: `npm ci`, `npm test`, `npm run start:api`, `npm run start:worker`, `npm run start:scheduler`.
- Focused backend test: `cd backend && node --test test/path/to/file.test.js`; full test suite is `npm test`.
- The backend is intentionally three processes: API `src/bin/api/api.js`, BullMQ worker `src/bin/worker/worker.js`, scheduler/polling `src/bin/scheduler/scheduler.js`.
- For local host-run backend, start only infra with `docker compose -f docker-compose.dev.yml up -d`, then run the three npm start scripts separately.
- For full local Docker stack, use `cd backend && docker compose up -d --build`; health check is `http://localhost:3000/api/health`.
- Backend loads `.env` via `src/config/index.js`; important values are `MONGO_URL`, `MONGO_DATABASE`, `REDIS_HOST`, `REDIS_PORT`, `BASE_URL`, `YOUTUBE_API_KEYS`, and `JWT_SECRET`.
- `BASE_URL` must be public HTTPS for YouTube WebSub callbacks; the API logs the callback as `${BASE_URL}/youtube/webhook`.
- API routes: `/api/channels/*`, `/api/auth/*`, `/api/sponsors/*`; WebSub at `/youtube/webhook`.
- Protected admin routes require Bearer JWT; seed first admin with `backend/scripts/seed-admin.mongosh.js`.

## Frontend And Dashboard
- `frontend/` requires Node `>=22.12.0` per `frontend/package.json`; commands are `npm run dev`, `npm run build`, `npm run preview`.
- `frontend/src/pages/index.astro` fetches `/api/channels?limit=200&sort=popular` at build time using `PUBLIC_BACKEND_URL` or `http://localhost:3000`, then falls back to mock data if unavailable.
- `dashboard/` commands are `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.
- Dashboard API base is `VITE_BACKEND_URL` or `http://localhost:3000` in `dashboard/src/services/api.js`; auth token/profile are stored in `localStorage`.
- Both frontend projects use Tailwind v4 through Vite plugins, not a separate Tailwind config file.

## Deploy And CI
- Production deploy: `backend/deploy/README.md` (VPS 2 vCPU / 4 GB, `deploy/server/` compose + `.env`, GHCR pull).
- Backend CI (`.github/workflows/backend-ci.yml`) runs `npm ci`, `npm test`, then `docker build` from `backend/` on Node 20.
- GHCR publishing builds `./backend/Dockerfile` and tags `ghcr.io/<owner>/<repo>/vnvtuber-backend` as `latest` on the default branch plus SHA tags.
- Production Docker deploy expects only `backend/deploy/server/docker-compose.yml`, `deploy.sh`, and `.env` on the server; it pulls `DOCKER_IMAGE` instead of cloning source.
