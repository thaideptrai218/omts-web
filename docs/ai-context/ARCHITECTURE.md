# ARCHITECTURE

## Công nghệ
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · react-hook-form + Zod · Redis (`@redis/client`, lưu phiên/proof) · VietMap GL · Vitest + Testing Library · Node 24.

> Next.js bản này có thay đổi lớn so với kiến thức cũ. Đọc `node_modules/next/dist/docs/` trước khi viết code.

## Cấu trúc thư mục
```
src/
├── app/
│   ├── (public)/   trang công khai, origin (QR)
│   ├── (auth)/     login, register, recover, onboarding, session
│   ├── (app)/      khu quản lý có bảo vệ: dashboard, farming, operations,
│   │               employees, access, account, cooperative, notifications...
│   └── api/        BFF route handlers (proxy tới backend, kiểm tra session/CSRF)
├── components/     ui, form, layout, feedback, brand, security (dùng chung)
├── features/       mỗi module nghiệp vụ một thư mục (rafts, farming-zones,
│                   purchasing-v2, employee-api, ...). Hậu tố -api = adapter thật
├── server/         code chỉ chạy phía server (session, Redis, gọi backend)
└── shared/         kiểu, tiện ích dùng chung
docs/               PROJECT_CONTEXT, decisions/, reports/, testing/, ai-context/
scripts/            run-api, setup-api-local, các script test
tests/fixtures/     fixture cho test cookie/browser
```

## Luồng dữ liệu
```
Component → hook/service (contract) → Repository adapter ─┬─ mock (bộ nhớ, reset khi reload)
                                                          └─ API → /api/* (BFF) → Backend
                                                                     ↑ session cookie + Redis, CSRF
```
- Component **không** gọi storage mock hay HTTP trực tiếp; chỉ qua service/repository để mock và API dùng chung interface.
- Trình duyệt chỉ nhận cookie phiên và dữ liệu đã chiếu (projection); token không xuống client.
- Chọn chế độ bằng biến môi trường `OMTS_DATA_SOURCE` (`mock` mặc định). Chạy API: `npm run setup:api`, `npm run build`, `npm run start:api`.
- Backend luôn là nơi quyết định quyền cuối; gate ở frontend chỉ để điều hướng/phản hồi.

## Lệnh
`npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run start`
