# N1 — Làm lại luồng hoàn tất ươm, 13/11/2026

## Đã làm

- Hoàn tất gồm **1/3 Kết quả ươm → 2/3 Chuyển sang bè → 3/3 Xem lại**. Bước đầu chỉ nhập kết quả, ngày và 1–3 ảnh; hao hụt ước tính hiện dưới số sống sót. Vùng luôn chỉ đọc, gồm mã và tên.
- Bước chọn bè dùng thẻ: mã, số làn, trạng thái, số mảnh tùy chọn và sản lượng dự kiến (kg). Chọn nhiều bè, chia theo số làn hoặc dồn hết vào bè được chọn. Tổng thiếu/thừa và ô trống chặn Tiếp tục.
- Xem lại có kết quả ươm, bảng từng bè nhận và nút “Xác nhận hoàn tất và bắt đầu nuôi”. Sống sót bằng 0 bỏ bước chọn bè, xác nhận hoàn tất với danh sách nhận rỗng.
- Hai chế độ điều chỉnh vẫn hai bước, yêu cầu lý do; giữ số đã thả làm giới hạn dưới và khóa bè đã kết thúc nuôi. Bản nháp số giữ dạng chuỗi, chuyển số khi tính/kiểm tra/gửi; nhận sản lượng `null` từ dữ liệu đọc thành ô trống. Với bè cũ, bỏ trống sản lượng sẽ giữ giá trị hiện có theo hợp đồng backend; có gợi ý tại ô và bảng xem lại phản ánh đúng giá trị này.
- Không có bè trống: nêu vùng, lý do không nhận thêm, liệt kê bè đang nuôi theo ngày bắt đầu và liên kết tạo bè trong vùng. Có nút tải lại. Bè vừa hết khả dụng sau tải lại vẫn hiện trong phần lựa chọn cần bỏ, không làm kẹt thao tác.
- Dùng từ ngữ đã chốt; đổi từ cũ trong lỗi backend ở phần hiển thị, giữ tên nội bộ và payload API. Key nút theo chế độ/bước, type tường minh; không thêm effect cập nhật state hoặc đọc ref khi render.

## Tệp N1

Trong `src/features/nursery-api/`:

- Điều phối: `nursery-complete-dialog.tsx`, `nursery-completion-steps.tsx`.
- Giao diện: `nursery-result-step.tsx`, `nursery-transfer-step.tsx`, `nursery-review-step.tsx`, `nursery-raft-card.tsx`, `nursery-allocation-fields.tsx`, `nursery-review-table.tsx`, `nursery-no-raft-notice.tsx`.
- Dữ liệu nháp/kiểm tra: `nursery-allocation-draft.ts`, `nursery-completion-validation.ts`.
- Giữ và tích hợp phần N1 có sẵn: `nursery-completion-messages.ts`, `nursery-raft-options.ts`, `nursery-zone-readonly.tsx`; tái sử dụng `allocation-calculations.ts`.
- Test: `allocation-calculations.test.ts`, `nursery-completion-validation.test.ts`, `nursery-raft-options.test.ts`, `nursery-complete-dialog.test.tsx`, fixture `nursery-completion-test-fixtures.ts`.

Các tệp N1 dưới 200 dòng. Không sửa tệp N0/N2 hoặc các module bán hàng, đơn khách, kế hoạch làm việc; giữ các thay đổi đồng thời trong cây mã. Không commit/push.

## Kiểm tra

- ESLint chỉ các tệp N1: đạt; các chỉnh sửa sau rà soát được kiểm tra lại riêng.
- Vitest chỉ 4 tệp test N1: **25/25 đạt**. Bao gồm chia/dồn, tổng khớp, số đã thả, đóng băng, số 0, ảnh, hai chế độ điều chỉnh, payload sau xem lại và bè vừa bận sau tải lại. Sau sửa kiểu `null`, chạy lại 2 tệp liên quan: **15/15 đạt**. Sau đối chiếu sản lượng giữ nguyên của bè cũ, test dialog chạy lại **7/7 đạt**.
- `npx tsc --noEmit -p .`: chạy đúng **một lần**, exit 1 với duy nhất TS2345 tại hàm khởi tạo bản nháp: `targetYieldKg` đọc có thể `null`, kiểu đầu vào cũ không nhận `null`. Đã mở kiểu đầu vào đúng hợp đồng và bổ sung kiểm tra hồi quy. Không chạy lại TypeScript theo hạn mức; chưa khẳng định lượt TypeScript cuối xanh sau sửa.
- `git diff --check` trên các tệp N1 được theo dõi: đạt. Không build, khởi động dev server, chạy toàn bộ test hoặc CI.

## Còn thiếu và giả định

- Danh sách bè theo vùng hiện chỉ có số làn, không có sức chứa theo mảnh hoặc kích thước. Không suy diễn mảnh/làn; bỏ nút “Đầy bè này” và thanh sức chứa. Số mảnh mỗi bè do người dùng nhập, không bắt buộc đầy.
- Lưới đặt một cột ở 360 px, hai cột từ `sm`, ba cột từ `lg`; bảng xem lại cố định chiều rộng, chữ/nút xuống dòng, giữ Dialog `xl`. **Chưa kiểm tra trực quan trên trình duyệt ở 360/1024/1366 px**, chưa chạy API thật trong lượt này.
- Backend tiếp tục quyết định điều kiện nhận tại lúc ghi, gồm bè vừa bận, ngày hoàn tất sau lần nuôi trước và bè đã có nhật ký không được gỡ. Không thêm trường/hợp đồng mới.
- Các workflow AGENTS dẫn tới trong `%USERPROFILE%/.Codex/rules/` không có trên máy; đã dùng AGENTS, tài liệu repo và guide Next.js cài tại máy.

Không còn câu hỏi nghiệp vụ mới.
