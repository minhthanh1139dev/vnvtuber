# YouTube WebSub & Livestream Tracker (MongoDB Clean Architecture)

A highly scalable, production-grade Node.js & Express service designed to track livestreams and uploads for **2,000+ YouTube channels** in real-time.

This system is built using a **Clean MVC/Services Architecture**, leveraging **Mongoose** for MongoDB schemas, **BullMQ (Redis)** for asynchronous queuing, **Express Controllers & Routers** for webhook endpoints, and a rotated, **adaptive background polling engine**.

---

## 🏗️ Clean MVC-Services Architecture

The project has been separated into independent, single-responsibility layers:
* **Controllers** (`src/controllers/`): Handles Express HTTP requests/responses, validates payloads, and delegates tasks.
* **Routes** (`src/routes/`): Sets up and organizes the routing paths and endpoint mappings.
* **Models** (`src/models/`): Defines robust Mongoose schemas for MongoDB (`Channel`, `ActiveStream`, `StreamHistory`).
* **Services** (`src/services/`): Houses all core business logic (YouTube API Key rotation, WebSub Hub postings, adaptive polling loops, cron-based auto-renewals, and Discord notifications).
* **Queues & Workers** (`src/queue/`): Manages asynchronous background processing and deduplication checks via Redis.

---

## 📁 Updated Directory Structure

```
├── data/
│   └── sample-channels.json         # Seeding channels list template
├── logs/
│   ├── app.log                      # Winston application audit logs
│   └── error.log                    # Critical error traces
├── scripts/
│   └── import-channels.js           # CLI script to bulk seed MongoDB
├── src/
│   ├── config/
│   │   └── index.js                 # Configuration loader (including MongoDB connection)
│   ├── controllers/
│   │   ├── channel.controller.js    # Express controller for REST Admin API
│   │   └── webhook.controller.js    # Express controller for Google WebSub webhook
│   ├── models/
│   │   ├── channel.model.js         # Mongoose schema for YouTube channels
│   │   ├── active-stream.model.js   # Mongoose schema for active polling list
│   │   └── stream-history.model.js  # Mongoose schema for ended stream history
│   ├── queue/
│   │   ├── index.js                 # BullMQ queue instantiator
│   │   └── worker.js                # Queue worker routines with Redis Deduplication
│   ├── routes/
│   │   ├── channel.routes.js        # REST Admin endpoints mapping
│   │   └── webhook.routes.js        # WebSub webhook endpoints mapping
│   ├── services/
│   │   ├── youtube.service.js       # Quota key-rotating YouTube Client
│   │   ├── websub.service.js        # WebSub hub subscription posting service
│   │   ├── polling.service.js       # Adaptive single-loop active stream poller
│   │   ├── scheduler.service.js     # Subscription lease cron renewal engine
│   │   └── notifier.service.js      # Discord webhook dispatcher
│   ├── utils/
│   │   └── logger.js                # Winston logger configuration
│   ├── db.js                        # MongoDB Mongoose connection manager
│   └── server.js                    # Core Express server & systems bootstrap
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
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# MongoDB connection URI
MONGO_URI=mongodb://127.0.0.1:27017/vnvtuber
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

### 5. Launch the Server
```bash
npm start
```
This connects Mongoose to MongoDB, hooks to Redis, loads background workers, and boots the HTTP endpoints.

---

## 📊 Administration API endpoints

The following HTTP API routes are exposed under `/api` for monitoring and system management:

1. **Check Status**: `GET http://localhost:3000/api/status`
   - Returns aggregated database figures, total channels grouped by subscription status, active streaming arrays being polled, and the latest 10 history logs.
2. **Add Single Channel**: `POST http://localhost:3000/api/channels`
   - Body: `{ "channelId": "UC...", "displayName": "..." }`
3. **Import Channels Bulk**: `POST http://localhost:3000/api/channels/import`
   - Body: `{ "channels": [ { "channelId": "UC...", "displayName": "..." } ] }`
4. **Manual Sync Trigger**: `POST http://localhost:3000/api/channels/sync`
   - Forces the cron scheduler to scan MongoDB for expiring or failed subscriptions, queuing them for staggered renews immediately.
