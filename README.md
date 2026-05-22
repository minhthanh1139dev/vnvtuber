# VNVtuber — YouTube live tracker

Production: CORS + Helmet + rate limit + Mongo `.lean()` + `npm test` + Docker Compose + GitHub Actions CI/CD trong `backend/`.

Theo dõi kênh YouTube có **đang live** hay không (WebSub + polling dự phòng).

## Quick start (backend)

```bash
cd backend
cp .env.example .env
# Điền: JWT_SECRET, MONGO_URL, MONGO_DATABASE, REDIS_*, BASE_URL (HTTPS khi test WebSub)
npm install

# Chạy 3 process riêng (khuyến nghị VPS yếu)
npm run start:api        # Express + webhook
npm run start:worker     # BullMQ consumers
npm run start:scheduler  # Cron WebSub renew + polling dự phòng

# Docker full stack
cd backend && docker compose up -d --build
```

### 1. Tạo admin (một lần)

```bash
mongosh "mongodb://127.0.0.1:27017/vnvtuber" --file backend/scripts/seed-admin.mongosh.js
```

### 2. Đăng ký kênh cần theo dõi

```bash
curl -X POST http://localhost:3000/api/channels \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"channelId":"UCxxxxxxxxxxxxxxxxxxxxxx","displayName":"Tên kênh"}'
```

Hệ thống tự đăng ký WebSub với YouTube Hub.

### 3. Kiểm tra live

```bash
# Trạng thái đã lưu trong DB (nhanh, không tốn quota)
curl http://localhost:3000/api/channels/UCxxxxxxxxxxxxxxxxxxxxxx/live

# Ép kiểm tra trực tiếp YouTube (~100 quota / lần)
curl "http://localhost:3000/api/channels/UCxxxxxxxxxxxxxxxxxxxxxx/live?refresh=true"

# Tất cả kênh đang live
curl http://localhost:3000/api/channels/live
```

## Cấu trúc repo

| Thư mục | Mô tả |
|---------|--------|
| `backend/` | API, WebSub, worker, polling |
| `frontend/` | Trang công khai (Astro) — tùy chọn |
| `dashboard/` | Admin UI (Vite) — tùy chọn |

Giai đoạn đầu chỉ cần chạy **backend** + Redis + MongoDB (`docker compose up` trong `backend/`).

## Production (VPS)

- **Production:** [backend/deploy/README.md](backend/deploy/README.md) — VPS 2 vCPU / 4 GB, Docker pull từ GHCR, chỉ `deploy/server/` trên máy
