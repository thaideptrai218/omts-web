# Bộ lọc thời gian dùng một thiết kế (12/11/2026)

Theo `docs/DESIGN_GUIDELINES.md` dòng 41: lọc danh sách không dùng hai ô Từ ngày/Đến ngày mà dùng `TimeRangeFilter` (một ô mở bảng mốc nhanh + Tùy chỉnh lịch hai tháng). Tám màn còn lệch đã chuyển. Ô ngày đơn (`Field type="date"` trong hộp thoại và form) đã đi qua `DatePickerField`, không đổi.

## Hàm mới (thuần, có test)
`src/components/ui/management-screen/time-range-limits.ts` (+ `.test.ts`), dùng lại `presetValue`, `isAllTime`, `fromQueryDate`, `toQueryDate` của `time-range-model`:
- `widestFrom(to, years)`, `boundedRange(value, today, years)`: "Toàn thời gian" thành khoảng rộng nhất API cho phép (ngày sau cùng ngày cách đây N năm, an toàn qua 29/2); giá trị khác giữ nguyên.
- `customRange`, `timeRangeKey` (mốc nhanh so theo tên, không theo ngày đã tính), `isTimeNarrowed`.

## Từng màn
| Màn | Cách chuyển | Mặc định / giới hạn API |
|---|---|---|
| `audit-api/audit-screen.tsx` | `TimeRangeFilter` "Thời gian thao tác" trong `FilterPanel`; state `time`, gửi `from/to` khi bấm Tra cứu như cũ | Toàn thời gian (không gửi ngày), như trước |
| `sales-invoice-list/invoice-filter-panel.tsx` (+ `invoice-list-logic.ts`, `use-invoice-list.ts`) | Bộ ba `preset/from/to` thay bằng `Filters.time`. `periodRange` tính lại mốc từ ngày hôm nay giờ Việt Nam; `isDefault` so theo tên mốc | Hôm nay. Backend tối đa 5 năm: "Toàn thời gian" = 5 năm gần nhất (có dòng chú thích), khoảng tùy chỉnh vẫn bị `filterProblem` chặn quá 5 năm. Link theo mã vẫn tìm 5 năm |
| `sales-reports/report-filter-parts.tsx` (+3 màn gọi `PeriodFilter`) | `PeriodFilter` là `TimeRangeFilter`, bỏ prop `name` | Tháng này; màn còn là khung, chưa có API |
| `purchasing-v2/receipts-list-filters.tsx`, `receipts-list-screen.tsx` | `from/to` thay bằng `time`; bỏ nút "Tháng này" riêng và kiểm tra `invalidPeriod` (lịch không cho khoảng ngược) | Toàn thời gian, như trước |
| `debts-api/debts-screen.tsx` | Bỏ hai ô, nút "Áp dụng kỳ", lỗi kỳ; chọn là áp dụng ngay cho sổ đối chiếu; xuất Excel không còn chờ áp dụng | Tháng này. Sổ cần đủ hai ngày: "Toàn thời gian" = 5 năm gần nhất (có chú thích) |
| `operations/payment-screen.tsx` | State `time` tách khỏi `filters`; "Xóa bộ lọc" tính cả thời gian | Toàn thời gian |
| `operations/my-work-screen.tsx` | Trong rail: một `TimeRangeFilter` thay hai `DatePickerField`; `period` suy ra từ `time` | Tháng này. API tối đa 63 ngày: khoảng dài hơn hoặc "Toàn thời gian" hiện thông báo tiếng Việt, không gọi API (không có 400) |
| `operations/receipt-list-filters.tsx`, `receipt-screen.tsx` | `time` là state riêng, truyền vào `FilterPanel` | Năm nay (trước là 1/1 đến hôm nay) |

Không có màn nào trong tám màn dùng `useStoredValue` cho ngày lọc nên không có gì để giữ.

## Test
Đã chạy: `time-range-limits.test.ts` (mới), `sales-invoice-list/*` (cập nhật `invoice-list-logic.test.ts`: `periodRange`, 5 năm, `isDefault`), `debts-api`, `sales-reports`, `workforce-screen`, `sales-workforce-write`, `receipt-invoices`, `lookup-recovery`: 61 test qua. eslint các tệp đổi sạch; `npx tsc --noEmit -p .` sạch. Không build, không dev server, không chạy cả bộ test.

## Giữ nguyên
- `my-work-leave-editor` (Nghỉ từ/đến ngày), `payroll-create-dialog` (Từ ngày/Đến ngày): nhập giá trị, không phải lọc; đã dùng `DatePickerField` (qua `Field type="date"`).
- `workforce-setup-dialog` "Nghỉ từ"/"Nghỉ đến": hai ô giờ `type="time"` gốc của trình duyệt, chưa có thành phần chọn giờ chung. Chỉ báo cáo.

## Còn lệch / cần chủ dự án biết
1. `TimeRangeFilter` chưa có tham số giới hạn mốc nên màn có giới hạn khoảng (Công việc của tôi 63 ngày; hóa đơn 5 năm) vẫn cho chọn mốc quá giới hạn, rồi chặn bằng thông báo thay vì ẩn mốc. Nếu muốn ẩn mốc thì cần thêm prop vào thành phần dùng chung.
2. Bộ lọc dạng `FilterPanel` ngang (audit, thanh toán NCC, phiếu nhập vật tư) cao hơn một hàng vì `TimeRangeFilter` có hai dòng (mốc + tùy chỉnh); bảng chọn mở sang phải, hết chỗ mới mở xuống.
3. Sổ đối chiếu công nợ NCC: trước đây để trống hai ngày là kỳ mặc định của backend (chưa có tài liệu); nay mặc định "Tháng này" gửi ngày rõ ràng. Cần xác nhận khớp ý backend.
4. Mốc "tháng/quý/năm này" có `to` là cuối kỳ (có thể sau hôm nay); các mốc cũ của hóa đơn dừng ở hôm nay. BFF chỉ kiểm từ <= đến nên không lỗi, kết quả không đổi vì chưa có chứng từ tương lai.
