# YouTube WebSub & Livestream Tracker (MongoDB Clean Architecture)

A highly scalable, production-grade Node.js & Express service designed to track livestreams and uploads for **2,000+ YouTube channels** in real-time.

This system is built using a **Clean MVC/Services Architecture**, leveraging **Mongoose** for MongoDB schemas, **BullMQ (Redis)** for asynchronous queuing, **Express Controllers & Routers** for webhook endpoints, and a rotated, **adaptive background polling engine**.

---

## 🏗️ Architecture (aligned with `base-backend-nodejs-master`)

```txt
src/bin/api/          → HTTP + WebSub callback only
src/bin/worker/       → BullMQ workers
src/bin/scheduler/    → Cron registry + polling backup
src/app.js            → Express app
src/infra/            → MongoDB, Redis connection config
src/jobs/             → Cron job definitions
src/scheduler/        → Cron registry
src/controllers/      → HTTP handlers
src/services/         → `*.service.js` — API / domain logic only
src/scheduler/        → cron registry + scheduler.* modules (background)
src/repositories/     → `*.repository.js` class + singleton
src/queue/            → BullMQ queue producers + worker factory
```

### Run processes

| Script | Process |
|--------|---------|
| `npm run start:api` | API Express |
| `npm run start:worker` | BullMQ worker |
| `npm run start:scheduler` | Cron + polling |

---

## 📁 Updated Directory Structure

```
├── data/
│   └── sample-channels.json         # Seeding channels list template
├── logs/                            # Winston (per process, max 20MB/file, 5 rotations)
│   ├── api.log / api.error.log
│   ├── worker.log / worker.error.log
│   └── scheduler.log / scheduler.error.log
│   └── error.log                    # Critical error traces
├── scripts/
│   └── seed-admin.mongosh.js        # mongosh: seed admin user (default admin/changeme)
├── src/
│   ├── config/
│   │   └── index.js                 # Configuration loader (including MongoDB connection)
│   ├── controllers/
│   │   ├── channel.controller.js    # Express controller for REST Admin API
│   │   └── webhook.controller.js    # Express controller for Google WebSub webhook
│   ├── repositories/
│   │   ├── channel.repository.js    # ChannelRepository
│   │   ├── user.repository.js         # UserRepository
│   │   ├── sponsor.repository.js      # SponsorRepository
│   │   └── video.repository.js        # VideoRepository (reserved)
│   ├── models/
│   │   ├── channel.model.js         # Mongoose schema for YouTube channels
│   │   └── video.model.js           # Consolidated stream/video tracking
│   ├── queue/
│   │   ├── channel.queue.js         # Channel BullMQ producers (webhook + WebSub)
│   │   ├── channel.worker.js        # Channel BullMQ consumers
│   │   ├── index.js                 # Re-exports channel.queue (API / scheduler)
│   │   └── worker.js                # Re-exports channel.worker (worker process)
│   ├── routes/
│   │   ├── channel.routes.js        # REST Admin endpoints mapping
│   │   └── webhook.routes.js        # WebSub webhook endpoints mapping
│   ├── bin/
│   │   ├── api/api.js               # API entrypoint
│   │   ├── worker/worker.js         # Worker entrypoint
│   │   └── scheduler/scheduler.js   # Scheduler entrypoint
│   ├── infra/
│   │   ├── mongodb.js               # DB connector
│   │   └── redis.js                 # Redis options for BullMQ
│   ├── jobs/
│   │   └── channel.job.js           # cron: WebSub renew (4h) + live poll (30s)
│   ├── scheduler/
│   │   ├── registry.js              # Cron registry
│   │   └── channel.scheduler.js     # WebSub + live detection (L1 worker, L2 poll)
│   ├── services/
│   │   ├── channel.service.js       # Channel.status + sync (API/domain)
│   │   ├── user.service.js          # Auth: login, JWT, change password
│   │   ├── ytb-api.service.js       # YouTube Data API v3
│   │   └── google-api-key.service.js
│   ├── utils/
│   │   └── discord-notify.js          # Discord webhook helper (background)
│   ├── app.js                       # Express app factory
│   └── bin/                         # Entrypoints: api, worker, scheduler
├── .env                             # Local credentials file (git-ignored)
├── .env.example                     # Environment setup template
├── package.json
└── README.md
```

---

## 🗄️ Database Schemas (MongoDB + Mongoose)

1. **`Channel`** (`Channel` collection):
   - `_id` (String): YouTube Channel ID (custom primary key: `UC_x5XG1OV...`).
   - `displayName` (String): Custom name tag.
   - `subscriptionStatus` (String): `unsubscribed`, `pending`, `subscribed`, `failed`.
   - `subscribedAt` (Date): Handshake confirmation timestamp.
   - `expiresAt` (Date): Exact lease expiration date calculated from `hub.lease_seconds`.
   - `lastError` (String): Google Hub reject logs.

2. **`ActiveStream`** (`ActiveStream` collection):
   - `_id` (String): YouTube Video ID (custom primary key: `videoId`).
   - `channelId` (String, ref 'Channel'): Channel relation mapping.
   - `title` (String): Streaming title.
   - `status` (String): `live` or `upcoming`.
   - `startedAt` (Date): Livestream actual start time.
   - `lastPolledAt` (Date): Last YouTube Data API status check timestamp.
   - `consecutiveErrors` (Number): Consecutive query errors for self-healing.

3. **`StreamHistory`** (`StreamHistory` collection):
   - `_id` (String): YouTube Video ID (custom primary key).
   - `channelId` (String): Channel identifier.
   - `title` (String): Streaming title.
   - `startedAt` (Date): Actual start time.
   - `endedAt` (Date): Actual end time.
   - `rawDetails` (Mixed): Complete schema-less payload dumped from the YouTube API.

---

## 🛠️ Step-by-Step Execution Guide

### 1. Requirements
- **Node.js** (v18+)
- **Redis Server** (required for BullMQ queue operations)
- **MongoDB Server** (v5.0+ local instance or Mongo Atlas cluster URI)

### 2. Setup Configuration (`.env`)
Configure credentials in `.env`:
```env
PORT=3000
BASE_URL=https://xxxx.ngrok-free.app

# Rotating keys list (comma-separated)
YOUTUBE_API_KEYS=key1,key2

# Redis connection details
REDIS_URL=redis://127.0.0.1:6379
# Upstash: REDIS_URL=rediss://default:TOKEN@endpoint.upstash.io:6379

# MongoDB (Atlas: URL without db path + database name)
MONGO_URL=mongodb://127.0.0.1:27017
MONGO_DATABASE=vnvtuber
```

### 3. Expose Server Publicly (e.g. ngrok)
Google requires a public, SSL-secured HTTPS endpoint to trigger verification.
```bash
ngrok http 3000
```
Copy your forwarding HTTPS address and set it as `BASE_URL` in `.env`.

### 4. Seed Database (Bulk Channel Import)
Import your channel lists (e.g. 2,000 channels) using the administrative CLI helper:
```bash
npm run import data/sample-channels.json
```

### 5. Launch (3 processes)

**Docker (khuyến nghị deploy):**

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
curl http://localhost:3000/api/health
```

| Container | Entry (`src/bin`) |
|-----------|-------------------|
| `vnvtuber-api` | `bin/api/api.js` |
| `vnvtuber-worker` | `bin/worker/worker.js` |
| `vnvtuber-scheduler` | `bin/scheduler/scheduler.js` |

Deploy production: [deploy/README.md](deploy/README.md)

**Local (không Docker app):**

```bash
docker compose -f docker-compose.dev.yml up -d   # chỉ Mongo + Redis
npm run start:api
npm run start:worker
npm run start:scheduler
```

---

## 📊 Core API (live check)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/api/channels/live` | — | Stream live/upcoming từ DB |
| GET | `/api/channels` | — | Danh sách kênh |
| GET | `/api/channels/:channelId/live` | — | Một kênh (`?refresh=true`) |
| POST | `/api/channels` | JWT | Đăng ký kênh + WebSub |
| POST | `/api/channels/import` | JWT | Import hàng loạt |
| POST | `/api/channels/sync` | JWT | Gia hạn WebSub |
| GET | `/api/channels/status` | — | Metrics (dashboard) |

Data model: `Channel` (metadata + `status.isLive`), `Video` (stream đang theo dõi). `channelId` trên `Video` là **String** (YouTube ID `UC...`), khớp `Channel._id`.

## 📊 Administration API endpoints

1. **Check Status**: `GET http://localhost:3000/api/channels/status`
2. **Add Single Channel**: `POST http://localhost:3000/api/channels` — Body: `{ "channelId": "UC...", "displayName": "..." }`
3. **Import Channels Bulk**: `POST http://localhost:3000/api/channels/import`
4. **Manual Sync Trigger**: `POST http://localhost:3000/api/channels/sync`
