# Thống nhất lịch trong Nuôi trồng — 12/11/2026

Đích chung: `components/ui/management-screen/date-picker-field.tsx`. `operations/ui.tsx` cung cấp `Field` tương thích ô nhập; mọi `date` và `datetime-local` đi qua lịch kit, giữ giá trị ISO, giới hạn ngày/giờ, trạng thái lỗi, vô hiệu hóa và tên trường gửi form. Không đổi quy tắc nghiệp vụ hay dữ liệu.

Đường dẫn dưới đây tương đối với `src/`. Các hàng ghi “qua Field” được thống nhất tại wrapper, không cần sửa từng nơi gọi.

| File | Control | Trước | Sau |
| --- | --- | --- | --- |
| `features/operations/ui.tsx` | Mọi Field ngày/ngày giờ | Kit + ô nhập ẩn riêng | Một kit control và giá trị form ISO; chuyển tiếp props |
| `components/ui/management-screen/date-input-field.tsx` | Wrapper tương thích Field | Logic chuyển đổi nằm trong operations Field | Nhãn gắn với ô thật, ref focus, required/disabled/readOnly, hidden name ISO, controlled/defaultValue |
| `components/ui/management-screen/date-picker-field.tsx` | Ngày và ngày giờ dùng chung | Giới hạn theo ngày, chưa kiểm giờ trong cùng ngày | Giữ min/max ngày; kiểm thêm giờ/phút; validation trên ô hiển thị, portal top layer trong dialog |
| `components/ui/management-screen/time-range-filter.tsx` | Khoảng tùy chỉnh (nước và mọi nơi dùng) | Lịch khoảng có kiểu/điều hướng riêng | Cùng CSS lịch kit + dropdown tháng/năm; giữ hai tháng, hover khoảng, Hôm nay/Bỏ qua/Áp dụng |
| `features/cultivation-api/records-seeding-form.tsx` | Ngày thả giống * | Field, giới hạn `backdateWindow` | Qua Field → kit; giữ min/max và thông báo backdate |
| `features/cultivation-api/records-material-form.tsx` | Ngày sử dụng * | Field | Qua Field → kit |
| `features/cultivation-api/logs.tsx` | Ngày thăm * | Field, min đầu chu kỳ/max hôm nay | Qua Field → kit; giữ cửa sổ ngày |
| `features/cycles-api/log-screen.tsx` | Ngày chăm sóc | Field, max hôm nay | Qua Field → kit |
| `features/cycles-api/cycle-editor.tsx` | Ngày bắt đầu; ngày thu hoạch dự kiến | Field | Qua Field → kit; giữ required và max ngày bắt đầu |
| `features/cycles-api/cycle-progress-tab.tsx` | Ngày xem | Field, max hôm nay | Qua Field → kit |
| `features/farming-api/license-editor.tsx` | Ngày hiệu lực; ngày hết hạn | Field | Qua Field → kit, tạo trong dialog/sửa tại chỗ |
| `features/zones-api/zone-licenses-tab.tsx` | Ngày xem tình trạng | Field required | Qua Field → kit |
| `features/lot-tracing/seeding-correction-dialog.tsx` | Ngày thả giống | Field required, disabled khi lưu | Qua Field → kit |
| `features/lot-tracing/log-correction-dialog.tsx` | Ngày ghi nhật ký | Field required, disabled khi lưu | Qua Field → kit |
| `features/operations/water-value-fields.tsx` | Thời điểm đo | Field datetime-local; min backdate/max giờ hiện tại | Qua Field → kit có giờ/phút; giữ chuyển đổi `toApiTime` |
| `features/operations/water-zone-filters.tsx` | Thời gian đo tùy chỉnh | TimeRangeFilter | Giữ luồng khoảng hai tháng; lịch dùng chung thiết kế kit |
| `features/operations/workforce-filter-rail.tsx` | Ngày làm việc | Kit trực tiếp | Giữ kit và điều hướng ngày trước/sau |
| `features/operations/workforce-assignment-editor.tsx` | Ngày phân công | Field | Qua Field → kit |
| `features/operations/workforce-setup-dialog.tsx` | Ngày hiệu lực | Field required | Qua Field → kit |
| `features/operations/my-work-leave-editor.tsx` | Nghỉ từ/đến ngày | Field; min ngày đến = ngày từ | Qua Field → kit; giữ min |
| `features/operations/my-work-screen.tsx` | Từ ngày/đến ngày | Kit trực tiếp | Giữ kit; giữ giới hạn khoảng trong bộ kiểm tra hiện có |
| `features/workforce-demo/screen.tsx` | Ngày làm việc; ngày phân công | Field | Qua Field → kit; không thêm dữ liệu mẫu |
| `features/farming-zones/components/zone-document-fields.tsx` | Hiệu lực/hết hạn giấy tờ (lớp cũ) | VietnameseDateInput + dialog ba ô ngày/tháng/năm | Field → kit; giữ RHF name/ref/blur và lỗi từng trường |
| `features/farming-zones/components/zone-documents.tsx` | Xem hiệu lực tại ngày (lớp cũ) | VietnameseDateInput | Field → kit |
| `features/rafts/components/raft-condition-panel.tsx` | Ngày xem sơ đồ (lớp cũ) | VietnameseDateInput | Field → kit |

## Kết quả rà soát và giới hạn

- Không còn `VietnameseDateInput`/`VietnameseDateChooser` trong các module Nuôi trồng đã rà; không phát hiện raw input date/datetime-local ngoài `Field` trong nhóm này.
- Giữ hai component legacy: vẫn được import bởi `account-management` và `employee-management` ngoài phạm vi công việc, nên chưa phải mã chết.
- `records-harvest-form.tsx` không có ô ngày/giờ chỉnh sửa; thời điểm thu hoạch do bản ghi máy chủ trả về. `water-threshold-panel.tsx` không có ô chọn ngày hiệu lực. Không thêm trường mới.
- `harvest-yield/**` do agent khác sở hữu, không sửa. Mọi thay đổi sẵn có của round 4 được giữ.
- ESLint `src/features/farming-zones/components src/features/rafts/components`: đạt. Lint `src/components/ui/management-screen src/features/operations` chỉ phát hiện lỗi chuyển tiếp ref; đã sửa bằng `useImperativeHandle` và lint lại file đạt. Helper thuần giới hạn giờ: 2/2 ca đạt. TypeScript: xem báo cáo cuối phiên.
- `npx.cmd tsc --noEmit -p .`: chạy một lần, đạt (exit 0), không có lỗi kể cả `.next/types`.
- Không chạy browser, build hay test batch theo yêu cầu. Chưa xác minh trực quan ở 360/1024 px, dialog top layer và chi tiết dòng; cách portal/định vị được rà bằng mã nguồn.

Câu hỏi còn mở: không có về quy tắc ngày; vẫn cần QA trực quan khi được phép.
