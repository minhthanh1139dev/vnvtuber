# Deploy backend (production)

Trên VPS **không cần clone source** — chỉ `server/docker-compose.yml`, `server/.env`, `server/deploy.sh`. Image build từ CI (GHCR).

## VPS (chốt)

| | |
|--|--|
| CPU | 2 vCPU E5 v4 |
| RAM | 4 GB |
| SSD | 40 GB (~21k/7k IOPS) |
| Backup | Tự động 1 lần/tuần |
| BW VN | 200 Mbps |
| BW quốc tế | 200 Mbps in / **10 Mbps out** (outbound = nút thắt YouTube API) |

OS: **Ubuntu 22.04** + Docker. Chỉ mở **22, 80, 443** — không expose Mongo/Redis.

**Stack:** `mongodb` + `redis` + `api` + `worker` + `scheduler` (compose đã cap Mongo cache **0.75 GB**, Redis **256 MB**). Live: WebSub → polling API.

## Lần đầu trên server

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"  # re-login

mkdir -p /opt/vnvtuber && cd /opt/vnvtuber
# Copy: server/docker-compose.yml, server/.env.example, server/deploy.sh
cp .env.example .env
nano .env   # DOCKER_IMAGE, BASE_URL (HTTPS), JWT_SECRET, CORS_ORIGINS, YOUTUBE_API_KEYS (boot lần đầu)
```

Image: push `main` → `backend-docker-publish.yml` → `ghcr.io/<owner>/<repo>/vnvtuber-backend:latest`  
Package private → `docker login ghcr.io` trên VPS.

```bash
chmod +x deploy.sh
./deploy.sh
```

HTTPS (Caddy ví dụ):

```caddy
api.your-domain.com { reverse_proxy 127.0.0.1:3000 }
```

Webhook: `https://api.your-domain.com/youtube/webhook`

Seed admin: `backend/scripts/seed-admin.mongosh.js` (mongosh vào container Mongo). Keys/API keys thêm qua **dashboard**.

## `.env` production (4 GB)

Xem `server/.env.example`. Quan trọng:

```env
WEBHOOK_WORKER_CONCURRENCY=2
SUBSCRIPTION_WORKER_CONCURRENCY=2
POLL_INTERVAL_LIVE_MS=120000
ENABLE_STREAM_SNAPSHOTS=false
```

OOM → giảm concurrency hoặc Mongo cache `0.5`. Nên cron `mongodump` ngoài backup tuần của nhà cung cấp.

## CI/CD (GitHub Actions)

| Workflow | Việc |
|----------|------|
| `backend-ci.yml` | Test + build image |
| `backend-docker-publish.yml` | Push GHCR |
| `backend-deploy.yml` | SSH scp compose + `docker compose pull/up` (`ENABLE_BACKEND_DEPLOY`, secrets `DEPLOY_*`) |

## Checklist

- [ ] `GET /api/health` qua HTTPS
- [ ] Admin login / seed
- [ ] Thêm kênh → WebSub `subscribed`
- [ ] Test live / webhook
- [ ] `docker stats` — không OOM

## Dev local (tùy chọn)

```bash
cd backend && cp .env.example .env && docker compose up -d --build
```
