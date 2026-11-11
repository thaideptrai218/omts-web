# 04 — Khung ứng dụng

## 1. Shell có đăng nhập (đang dùng): thanh menu ngang
Dùng bởi `features/auth/components/app-session-shell.tsx` (mock) và `features/api-workspace/api-workspace-shell.tsx` (API), cả hai qua `AppShell` + `top-shell.module.css`.

- **Hàng nhận diện** (`.identity`, max 1440px, đệm `16px 48px`): liên kết về `/dashboard` với `BrandMark iconOnly compact`, "HTX Thủy sản Trung Nam", dòng phụ "Quản lý nuôi hàu & truy xuất nguồn gốc". Bên phải: `topAction` (chuông `InboxBell` ở chế độ API) và menu tài khoản `<details>` (chữ cái đầu, tên, vai trò; "Hồ sơ cá nhân" → `/account`; "Đăng xuất" / "Đang đăng xuất…").
- **Thanh menu** (`.menu`, nền `#315a96`): `<nav aria-label="Điều hướng chính">` (local) hoặc `"Chức năng"` (API). Mỗi nhóm là dropdown `<details>` rộng tối thiểu 270px, cao tối đa 70vh.
- **Sub-nav ngữ cảnh** (`.contextNav`, chỉ API): `<nav aria-label="Các bước nuôi trồng">` gồm Chu kỳ, Thả giống, Vật tư, Thu hoạch, Đo nước; `aria-current="page"` ở tab hiện tại.
- **Trang**: `<main id="workspace-main">`, max 1440px, đệm 32px 48px; `<section>` con có hoạt ảnh vào 0.28s.
- **Responsive**: ≤900px menu xuống dòng, tên tài khoản ẩn; ≤540px dropdown thành `position: fixed` cách mép 12px, chữ nhỏ hơn; 901–1199px đệm ngang 32px. Shell **không có** `@media` riêng cho 360 hay 1024; hai mốc này chỉ được kiểm bằng QA trình duyệt.
- **Đăng xuất (API)**: `window.location.replace`; lỗi hiện "Chưa thể đăng xuất. Kiểm tra kết nối rồi thử lại."; đồng bộ nhiều tab qua `BroadcastChannel("omts-auth-lifecycle-v1")` rồi tải lại trang.
- **Breadcrumb**: không có.

### Cây điều hướng (chế độ API, theo nhãn)
Quản trị hệ thống (chỉ sysadmin) · Điều hành · Nuôi trồng · Vật tư & mua hàng · Nhân sự & phân quyền · Kinh doanh · Báo cáo · Tài khoản.

## 2. Sidebar cũ (còn code, không mount)
`app-shell.module.css`, `use-sidebar-expansion.ts`, `sidebar-account.tsx` chứa sidebar hoàn chỉnh; chỉ `.navigationLink`, `.navigation`, `.iconSlot`, `.linkLabel` còn được import. Thiết kế khi đó:
- Desktop ≥1024px: lưới `232px | 1fr`, thu gọn `64px | 1fr`, chuyển 180ms, khung nội dung bo 12px; ghim mặc định.
- Bỏ ghim: hover mở sau 160ms, đóng sau 280ms; focus bàn phím giữ mở; `expanded = pinned || hovered || focused`. Nhãn nút "Thu gọn menu" / "Giữ menu mở" / "Mở rộng menu". Thu gọn = rail icon có `title`.
- Mobile <1024px: header dính 56px + drawer `<dialog>` rộng 18rem hoặc 88%, dùng khóa cuộn; liên kết cao tối thiểu 44px.

Lịch sử: `WEB_SHELL_LOGIN_REDESIGN_2026-11-04` (duyệt sidebar) → `WEB_SIDEBAR_NAVIGATION_2026-11-06` (Link + lưu vị trí cuộn) → `WEB_TOPNAV_CULTIVATION_EXPERIMENT_2026-11-07` (thay bằng menu ngang + tab nuôi trồng; test đặt tên "approved top navigation").

## 3. Auth shell (`layout/auth-shell.tsx`)
- <1024px: một cột (header thương hiệu, form tối đa 410px, footer), đệm 24px, ẩn panel câu chuyện.
- ≥1024px: lưới `1.05fr | 1fr`, đệm 16px; panel phải màu navy bo 18px có ánh teal radial: nhãn "GẮN KẾT TỪ VÙNG NUÔI", `AnimatedOyster`, tiêu đề "Từ vùng nuôi, đến từng lô hàu.", đoạn mô tả, footer "Nuôi trồng / Mua bán / Truy xuất nguồn gốc".
- Cột form dùng `:global` để tạo kiểu cho class `.login-panel`, `.login-eyebrow`, `.login-title`, `.login-links` — markup login của feature phụ thuộc các tên này. Input cao 48px, focus có vòng box-shadow.

## 4. Nhóm route (`src/app`)
- `(auth)`: login, onboarding, recover, register, session.
- `(app)`: access, account, audit, cooperative, dashboard, employees, farming, notifications, operations, system, trader-requests, workspace.
- `(public)`: trang chủ landing, `origin` (truy xuất QR), `dev`.
