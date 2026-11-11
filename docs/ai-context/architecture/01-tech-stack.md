# 01 — Công nghệ

| Hạng mục | Phiên bản | Lý do dùng |
| --- | --- | --- |
| Node | 24 (`.nvmrc`; CI dùng `node-version-file`) | Runtime; `scripts/run-api.mjs` dùng `process.loadEnvFile` |
| next | 16.4.3 | App Router, Route Handlers làm BFF, RSC. `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true`; chỉ trên win32 `experimental.cpus: 2` |
| react / react-dom | 19.3.0 | UI |
| typescript | ^5 | `strict`, `moduleResolution: bundler`, alias `@/*` → `./src/*` |
| zod | ^4.6.7 | Schema hợp đồng wire, parse env, validate request — công cụ ranh giới chính |
| react-hook-form + @hookform/resolvers | ^7.90.0 / ^5.9.1 | Form |
| @redis/client | 6.3.0 (ghim) | Lưu phiên, sổ đăng nhập, flow xác minh; chạy Lua bằng `EVAL`; cần Redis ≥ 6.2 vì script dùng `PXAT` |
| server-only | 0.0.1 | Chặn import module server vào Client Component lúc biên dịch |
| @vietmap/vietmap-gl-js | 6.0.1 | Bản đồ vùng, dùng `NEXT_PUBLIC_VIETMAP_API_KEY` |
| tailwindcss ^4, @tailwindcss/turbopack ^4 | | Style; rule Turbopack chỉ áp loader cho `globals.css`, nơi khác dùng CSS Modules |
| vitest ^4.1.12, jsdom ^29.1.1, @testing-library/react ^16.3.3, @testing-library/user-event ^14.6.8 | | Test; môi trường mặc định `node`, test component dùng jsdom |
| eslint ^9 + eslint-config-next 16.4.3 | | Flat config |

- Font: `next/font/google` — Be_Vietnam_Pro và Geist_Mono. Chữ giao diện tiếng Việt.
- **Không** có Axios, SWR, React Query; client dùng `fetch` thuần qua repository.
- `eslint.config.mjs` có `no-restricted-imports` cấm import `**/__tests__/**` vào code production dưới `src/**`.
- `vitest.config.mts`: `maxWorkers` = 1 trên win32, 4 nơi khác.
- Cảnh báo `AGENTS.md`: Next bản này có thay đổi lớn; đọc `node_modules/next/dist/docs/` trước khi viết code.
