# Web: Báo cáo Cuối ngày (Dạng bảng + Dạng Báo cáo) - worktree `D:/omts/.wt/eod-web`, branch `feat/end-of-day-report-viewer` (chưa commit)

## Kết quả kiểm
- `npx tsc --noEmit`: sạch (chỉ còn lỗi có sẵn `PageProps`/`LayoutProps` khi chưa chạy `next typegen`; `npm run build` đã chạy typegen và qua).
- `eslint` các file đã đổi: 0 lỗi, 0 cảnh báo. `npm run lint` toàn repo còn 5 cảnh báo có sẵn ở file không liên quan (cultivation-api, harvest-plans).
- vitest `src/features/sales-reports` + `src/server/operations`: 28 file, 386 test pass.
- `npm run build`: thành công (1m15s).
- Chưa kiểm trình duyệt, chưa smoke BFF với API :8080 (cần phiên đăng nhập; để controller làm).

## Files
Sửa: `src/components/ui/interface-icon.tsx` (+10 icon: undo, redo, print, zoom-in, zoom-out, fullscreen, fullscreen-exit, eye, square-plus, square-minus), `end-of-day-contracts.ts`, `end-of-day-parts.tsx` (còn EndOfDaySection/EmptyNote; bỏ PRINT_CSS cũ), `end-of-day-report-screen.tsx`, `end-of-day-report.module.css`, `use-end-of-day-report.ts`, `src/server/operations/end-of-day-report-plan.ts`.
Xóa: `end-of-day-sections.tsx`.
Mới (`src/features/sales-reports/`):
- `end-of-day-filters-model.ts` (state, URL, query, kiểm tra), `use-end-of-day-filters.ts` (nháp -> Xem báo cáo, ghi URL, restore), `end-of-day-filters.tsx` (cột lọc), `end-of-day-filter-fields.tsx` (lọc riêng từng concern), `end-of-day-multi-filters.tsx` (chọn nhiều, PersonPicker nhiều người, pills).
- `end-of-day-model.ts` (mô hình tài liệu dùng chung 2 kiểu xem: bảng, dòng, mở/đóng, `stampText`), `end-of-day-build/{sales,money,goods,summary,index}.ts` (row builders), `end-of-day-head.ts` (đầu trang giấy), `end-of-day-table-view.tsx`.
- `end-of-day-paper/`: `paginate.ts`, `paper-flow.ts`, `paper-search.ts`, `viewer-history.ts`, `paper-page.tsx`, `use-paper-pages.tsx`, `paper-toolbar.tsx`, `paper-print.tsx`, `paper-viewer.tsx`, `paper.module.css`.
- Test: `end-of-day-filters-model.test.ts`, `end-of-day-build/build.test.ts`, `end-of-day-paper/{paginate,paper-search,paper-viewer}.test.tsx|ts`, `src/server/operations/end-of-day-report-plan.test.ts`.

## Cách chia trang
1. `buildDocument(report)` cho mô hình chung (bảng -> cột có tỉ lệ rộng, dòng group/item/detail có `toggle`/`parent`, dòng tổng). `buildFlow` biến nó (sau khi áp trạng thái mở/đóng) thành dòng chảy: đầu báo cáo, tiêu đề bảng, từng dòng, dòng tổng, ghi chú.
2. `usePaperPages` vẽ một khối ẩn (`position:absolute; left:-100000px; visibility:hidden`) rộng đúng bề rộng nội dung trang (A4 trừ lề 12mm hai bên); mỗi phần tử một `div[data-measure]` (dòng bảng là bảng 1 dòng, `table-layout:fixed`, `border-collapse:separate` nên chiều cao cộng được) và mỗi bảng thêm một khối chỉ có dòng tiêu đề. `useLayoutEffect` đo `getBoundingClientRect().height` trước khi vẽ, đo lại khi phần tử/hướng giấy đổi và sau `document.fonts.ready`.
3. `paginate(items, contentHeight, headerHeights)` (hàm thuần): dồn lần lượt; dòng đầu của mỗi đoạn bảng trên một trang được cộng chiều cao tiêu đề (nên tiêu đề lặp ở mọi trang); đầu báo cáo và tiêu đề bảng `keepWithNext`; phần tử cao hơn cả trang đứng một trang riêng. Trừ 6px dự phòng; chiều cao nội dung = khổ A4 trừ lề trên 12mm, dưới 14mm (chứa "Trang n/N").
4. Dữ liệu, ⊞/⊟, đổi dọc/ngang đều đổi entries/hướng -> đo lại -> chia lại. Thu phóng dùng CSS `zoom` nên không đổi bề rộng bố cục, không cần chia lại.
5. Cuộn liên tục (mặc định) hoặc "Xem trước khi in" = từng trang một. Trang đang xem theo cuộn (mép trên đã qua 35% khung).
6. In: `PaperPrintRoot` portal các trang vào `body` (ẩn trên màn hình, `body > *:not([data-eod-print-root]){display:none}` khi in) + `@page { size: A4 portrait|landscape; margin: 0 }`; mỗi tờ đúng khổ mm (thấp hơn 0,4mm), `break-after: page`. Không còn `visibility:hidden` + `position:absolute` nên không lệch phải/không trang trắng thừa (chưa thử máy in thật).

## Giả định về contract (đã khớp báo cáo backend)
- Khối của concern khác là `null` -> zod `.nullish()`; `filters` đủ các danh sách (zones, customers, products, categories, people, receivedBy, createdBy, types dạng `{id,name}`; paymentMethods... dạng chuỗi) và bắt buộc có mặt.
- `sales.groups[].rows[].zoneName` nullable (đơn hàng); `sales.totals` gồm `quantityKg, revenue, discount, otherCharges, paid, debt, netRevenue`; `goods.totals` có. Web tự cộng tổng bảng Hàng hóa từ `products`/`lots` (không phụ thuộc `goods.totals`, chỉ parse).
- Giá trị dòng Trả hàng hiển thị đúng như backend trả (âm).
- BFF nhận chỉ các tham số mới (không nhận `date`, `method`); danh sách từ trình duyệt dạng `a,b,c`, tách và gửi lặp tham số; GUID tối đa 50 (backend cho 200), enum tối đa số giá trị; `from`/`to` `yyyy-MM-ddTHH:mm` có kiểm ngày thật và `from <= to`; `format|orientation|expanded` chỉ cho `action=export`.
- `expanded` = concern goods và mọi dòng sản phẩm đang mở; concern khác gửi `false`. Có thêm nút "Mở rộng/Thu gọn tất cả" trên toolbar (ngoài danh sách yêu cầu) để điều khiển việc này.
- Mã chứng từ link bằng mã: Đặt hàng `/sales/orders?code=`, Hóa đơn `invoiceHref`, Trả hàng `salesReturnHref`, SP `productHref`, thu chi sang Sổ quỹ `?search=<mã>` (`farmingReferenceHref("cashBook")`, vì Sổ quỹ chưa có `?code=`).
- Lọc: Khách hàng/Sản phẩm dùng `useCustomerOptions/useProductOptions`; Nhóm hàng `productRepository.groups()`; Loại thu chi `listTypes()` của Sổ quỹ (nhãn "Tên (Thu|Chi)"); người = `listCollectors()` (cùng nguồn PersonPicker của màn cũ). Money ẩn ô Vùng nuôi (không lọc theo vùng).
- Thời gian (a): một `DatePickerField` ngày + công tắc "Chọn giờ trong ngày" mở hai `DatePickerField withTime` (chỉ lấy phần giờ; min/max khóa trong ngày). (b): `TimeRangeFilter` chung, không cho "Toàn thời gian", tối đa 366 ngày, không ngày tương lai.
- Đổi Kiểu hiển thị, Hướng giấy, Mối quan tâm có hiệu lực ngay (không gọi lại API nếu chỉ đổi 2 cái đầu); lọc còn lại theo "Xem báo cáo". URL giữ `concern, view, orient, mode, day, ft, tt, from, to, zones, customers, receivedBy, createdBy, pay, channels, terms, funds, sources, types, partyKinds, products, categories`.
- Màu giấy lấy từ token: tiêu đề bảng = nền tint 16% của `--omts-color-primary` (không phải xanh dương như ảnh mẫu), dòng nhóm = `--omts-color-warning-soft` (be), link mã = màu chủ đạo. Đổi theo chủ đề.

## Test đã thêm
- BFF plan (8 test): tham số hợp lệ, lặp tham số, từng concern, bỏ trùng, giá trị sai (concern, giờ, ngày không có thật, khoảng ngược, GUID, enum, >50), tham số lạ/lặp/POST/body, export đủ tham số, format/orientation/expanded chỉ cho export.
- Chia trang (hàm thuần, chiều cao giả): vừa 1 trang, tách trang, tiêu đề lặp làm ít dòng hơn, keepWithNext, khối ngoài bảng, hai bảng, dòng quá cao, giữ đủ/đúng thứ tự, hình học A4 dọc/ngang, `clampPage`.
- Row builders 4 concern (nhóm, link theo mã, Khách lẻ, tổng, mở/đóng, tổng hợp, rỗng, đầu trang, `stampText`, parse khối `null`), điều kiện lọc/URL/query/kiểm tra, tìm kiếm (bỏ dấu, tô sáng, đếm, quay vòng), lịch sử Quay lại/Tới.
- Toolbar: tên tiếng Việt, đầu/trước/sau/cuối, khóa ở biên, ô số trang (Enter, kẹp, bỏ chữ), tải PDF/Excel, các nút gọi đúng hàm; viewer: đầu trang + chân trang, ⊟/⊞ đóng/mở dòng, tìm tô sáng và nhảy kết quả, zoom, xem trước, in (portal + `@page`). Không có test đo layout thật (jsdom không có layout): cần kiểm trình duyệt.

## Câu hỏi mở / rủi ro
1. Chưa xem trên trình duyệt: độ chính xác chia trang (đo vs in), phông chữ, bề rộng cột ở dọc với 10 cột (Bán hàng, Thu chi), `zoom` trên Firefox cũ (<126), Fullscreen API, in thật không lệch.
2. Kế toán 1 vùng: hiện dùng `useReportZones` theo quyền View từng vùng; money chỉ user mọi vùng (backend trả `entries: []`), web không báo gì riêng.
3. Nút "In"/"Tải xuống" ở Dạng bảng: bỏ nút In cũ (in chỉ qua Dạng Báo cáo); Tải xuống ở Dạng bảng dùng hướng giấy đang chọn (mặc định dọc).
4. Các ô lọc lấy danh sách khách/sản phẩm/người bằng API khác (có thể 403 với Kế toán thiếu quyền) -> hiện "Chưa tải được danh sách. Tải lại", báo cáo vẫn xem được.
5. Nhãn "Phụ thu" cho `otherCharges` (backend file ghi "Thu khác"); đổi một chỗ ở `end-of-day-build/sales.ts` nếu PM muốn thống nhất.
6. Backend giới hạn danh sách 200, BFF 50 (theo yêu cầu).

Status: DONE_WITH_CONCERNS
Summary: Web hoàn tất theo contract backend cuối: bộ lọc mới, Dạng bảng 4 concern, Dạng Báo cáo tự dựng (chia trang đo thật, toolbar đủ nút, tìm, in qua portal), BFF plan strict; tsc/eslint/vitest/build đều qua.
Concerns/Blockers: Chưa kiểm trình duyệt và chưa smoke với API thật (chia trang/in/fullscreen chỉ được kiểm bằng test thuần và jsdom).
