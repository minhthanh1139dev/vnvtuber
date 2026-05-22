# VNVtuber Admin Dashboard

React + Vite admin UI. Requires backend API and JWT login.

## Stack

- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives, components in `src/components/ui/`)
- **TanStack Query** — fetch/cache API
- **TanStack Table** — CRUD tables (sort, filter, pagination via `DataTable`)
- **React Hook Form + Zod** — forms & validation
- **Recharts** — channel overview chart

## Tabs

- **Kênh** — danh sách, thêm kênh, import hàng loạt (`POST /api/channels`, `/api/channels/import`), đồng bộ WebSub (header)
- **Google API Key** — CRUD pool YouTube Data API keys (`/api/google-api-keys`)

## Dev

```bash
cd dashboard
npm install
npm run dev
```

Set `VITE_BACKEND_URL=http://localhost:3000` if the API is not on the default host.

### Thêm shadcn component (tùy chọn)

```bash
npx shadcn@latest add dropdown-menu form
```

Alias `@/` → `src/` (xem `components.json`, `vite.config.js`).
