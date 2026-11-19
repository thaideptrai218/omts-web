# Phase 1 – Nền tảng web cho báo cáo

## Mục tiêu
Khung chung để các màn báo cáo giống nhau: bộ lọc trái (kỳ + vùng + tiêu chí), nút "Xem theo: Biểu đồ | Bảng", ô chỉ số, xuất Excel.

## Đọc trước
- `src/features/sales-reports/report-screen-shell.tsx`, `frame-parts.tsx` (`FrameTiles`, `FrameTable`, `FrameSection`), `chart-frame.tsx`
- `src/features/harvest-yield/yield-filter-panel.tsx`, `yield-trend-chart*` (mẫu biểu đồ SVG + lọc nháp/áp dụng)
- `src/components/ui/management-screen/management-layout.tsx`, `src/components/ui/management-page.tsx`
- `TimeRangeFilter` + `time-range-model.ts`; `api-workspace/selected-zones.tsx`
- `src/features/operations/permissions.ts`, `operation-screen.tsx`, `repository.ts` (`read`, `download`)
- `src/features/api-workspace/api-workspace-shell.tsx` (nhóm "Báo cáo", dòng ~51–60)

## Việc làm
1. Cài thư viện biểu đồ (D4: `recharts`, version cố định, kiểm tra peer deps với React/Next của repo; dùng `"use client"`). Trước đó đọc kỹ `src/features/harvest-yield/yield-trend-chart*` để biết giao diện hiện tại (màu, nhãn, chú giải, tooltip).
2. Tạo `src/components/ui/charts/` bọc recharts, giao diện na ná biểu đồ Sản lượng nuôi:
   - `bar-chart.tsx` (cột, nhiều series, tuỳ chọn cột chồng), `line-chart.tsx`. Props: `points: {label, values: number[]}[]`, `series: {name, tone}[]`, `valueFormat`. Tooltip tiếng Việt, chú giải bấm ẩn/hiện series, trục VND rút gọn "1,2 tr", màu lấy từ token CSS (hỗ trợ dark mode), `aria-label` + bảng số liệu thay thế cho trình đọc màn hình, co giãn theo khung (`ResponsiveContainer`), skeleton khi loading, trạng thái rỗng.
   - `format-money-short.ts` (+ test nhỏ).
3. **Chuyển biểu đồ Sản lượng nuôi** (`yield-trend-chart*`) sang component mới, nhìn gần giống bản cũ; xoá code SVG cũ không còn dùng; chạy lại test `src/features/harvest-yield`.
2. Mở rộng `report-screen-shell.tsx` (không tạo file "enhanced"): slot `filters`, `tiles`, `view: "chart" | "table"` toggle, `onExport`, trạng thái loading/rỗng/lỗi/không quyền.
3. Hook `useReportFilters` trong `src/features/sales-reports/` dùng lại time-range + zones, kiểu nháp → "Áp dụng", đồng bộ query string (để F5 giữ lọc).
4. Thêm keys vào `operationModules`/`operationAreas`: `end-of-day-report`, `product-report`, `customer-report`, `supplier-report`, `financial-report` (giữ `sales-report`, `price-trend-report`, `after-sales-report`, `harvest-yield`). Quyền theo phase-00 D5.
5. Menu "Báo cáo" sắp theo KiotViet: Cuối ngày · Bán hàng · Hàng hóa · Khách hàng · Nhà cung cấp · Tài chính | Xu hướng giá · Vấn đề sau bán · Sản lượng nuôi. Key chưa làm xong thì chưa hiện (ẩn bằng cờ trong `permissions.ts`, không hiện "đang phát triển").
6. Sửa test điều hướng `api-workspace-seed-navigation.test.tsx` nếu đổi menu.

## Xong khi
- Component biểu đồ render được với dữ liệu mẫu trong test (không đưa mẫu lên UI).
- lint, typecheck, vitest `src/components/ui/charts src/features/sales-reports src/features/api-workspace` pass.
- Xem 360px và 1024px: bộ lọc thành ngăn kéo ≤900px (đã có), bảng cuộn ngang.
