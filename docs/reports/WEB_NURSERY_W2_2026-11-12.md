# W2 — Màn Ươm giống, 12/11/2026

Nguồn nghiệp vụ: [đặc tả chốt](FARMING_NURSERY_STEP_SPEC_2026-11-12.md), mục 3, 5, 7, 10; [hợp đồng API B1](FARMING_NURSERY_API_CONTRACT_2026-11-12.md). Báo cáo phản ánh mã Web; chưa xác nhận tích hợp backend thật, chưa coi Jira Done.

## Đã triển khai

- Route `/farming/nursery`; menu **Ươm giống** sau **Bè nuôi**. Danh sách theo vùng, tìm kiếm, trạng thái, thời gian; phân trang/sắp xếp phía máy chủ, chọn cột, skeleton, lỗi/thử lại và trạng thái trống.
- Chi tiết mở dưới dòng: thông tin, ảnh, lịch sử, phân bổ và liên kết hành trình chu kỳ. Chỉnh sửa ngay trong tab Thông tin; hủy có lý do, chỉ khi Đang ươm. Bảo vệ nội dung chưa lưu và thao tác đang xử lý.
- Bắt đầu và hoàn tất ươm dùng pop-up hai bước; xem lại tồn trước/sau, số vào, sống sót và hao hụt **ước tính**, phân bổ từng bè trước khi xác nhận.
- Phân bổ một/nhiều bè cùng vùng; dồn về một bè hoặc chia theo số làn. Tính đến 0,01 mảnh, báo số thiếu/thừa; chặn tổng lệch. Sửa sống sót có cũ → mới và lý do; giữ ràng buộc đã thả/chu kỳ đã chốt.
- Ảnh tạm trong module: 1–3 JPEG/PNG, xem trước/xóa/đếm; kiểm tra 10 MB mỗi ảnh, xử lý hướng EXIF khi giải mã, nén JPEG cạnh dài tối đa 1600 px, chất lượng 0,82.
- Toast sau lưu thành công; lỗi trường/nguồn backend hiện tại form. Kết quả ghi không xác định/xung đột yêu cầu đối chiếu trước khi gửi lại.
- Hành trình chu kỳ thêm **Ươm** nếu backend trả `nurseryBatchId`; liên kết theo mã NU. Không đổi lõi làn W1.

## Tệp và luồng dữ liệu

| Phạm vi | Tệp/nhóm tệp |
| --- | --- |
| Giao diện, hợp đồng đọc, service/repository, ảnh và tính toán | `src/features/nursery-api/**` |
| BFF, schema ghi strict, upload, lỗi và proxy ảnh | `src/server/nursery/**`, `src/app/api/nursery/route.ts` |
| Route trang | `src/app/(app)/farming/nursery/page.tsx` |
| Menu | `src/features/api-workspace/api-workspace-shell.tsx` |
| Hành trình | `src/features/cycles-api/contracts.ts`, `cycle-journey-model.ts`, `cycle-journey-tab.tsx` |
| Liên kết | `src/features/farming-management/entity-links.ts`, `farming-reference-href.ts` |
| Mở tạo bè từ vùng chưa có bè | `src/features/rafts-api/raft-screen.tsx` |

UI → `nurseryService` → repository → `/api/nursery` → backend. BFF dùng CSRF hiện có, quyền `CultivationCycles` theo vùng, đối chiếu vùng thật của bản ghi và kiểm tra lại phiên; ảnh được đọc qua proxy BFF.

## Lựa chọn theo hợp đồng

- Schema đọc dùng `z.object`, bỏ trường bổ sung ngoài danh sách; trường mở rộng có thể thiếu dùng optional/default. Trường định danh/trạng thái cốt lõi vẫn được kiểm tra. Schema gửi ghi dùng `z.strictObject`.
- `photos` là phần multipart lặp; `allocations` là **một** chuỗi JSON. Sửa ảnh gửi `keepPhotoIds` và ảnh mới theo hợp đồng.
- Danh sách bè lấy qua API chu kỳ theo vùng đang có. Backend vẫn quyết định bè đủ điều kiện tại thời điểm ghi, tránh dựa vào dữ liệu xem trước đã cũ.
- Sống sót bằng 0: phân bổ rỗng, hoàn tất đợt và không tạo chu kỳ. Không nhập/gửi ngày thu dự kiến trong luồng Ươm.
- Web hiện tồn trước/sau nhưng chưa biết cấu hình cho phép tồn âm của HTX; backend là nơi chặn hoặc chấp nhận vượt tồn theo cấu hình. Không tự thêm hợp đồng cấu hình.
- Hành trình chỉ dùng `nursery*` thực sự trả trên chu kỳ; không suy diễn số vào/hao hụt cả đợt từ phần phân bổ của một bè. Đọc ngày thu dự kiến cũ chấp nhận thiếu để tương thích phản hồi mới; việc chỉnh toàn bộ form chu kỳ thuộc module tiếp theo.

## Kiểm tra và phần còn lại

- ESLint toàn bộ tệp thay đổi đạt; test hàm thuần mới **6/6 đạt**.
- `npx tsc --noEmit -p .` chạy đúng **một lần**, exit 1: `nursery-http.ts(55,124) TS2339`, TypeScript mất narrowing của `backend.config` trong closure. Đã sửa bằng cách giữ `const config = backend.config` sau nhánh kiểm tra cấu hình API; dùng `config.origin`/`config.timeoutMs`. ESLint riêng bản sửa đạt, `git diff --check` đạt. Không chạy lại tsc theo giới hạn yêu cầu; chưa khẳng định TypeScript xanh sau sửa.
- Chưa chạy backend thật/trình duyệt ở 360 px và 1024 px; cần QA luồng hoàn tất chia hai bè, ảnh EXIF, quyền Owner/Quản lý vùng và phản hồi 404/xung đột.
- Không chạy build, dev server, bộ test dài; không commit/push theo yêu cầu phiên làm việc.
- Các tệp workflow mà AGENTS dẫn tới trong `%USERPROFILE%/.Codex/rules/` không tồn tại trên máy: `development-rules.md`, `primary-workflow.md`, `orchestration-protocol.md`, `documentation-management.md`. Đã dùng AGENTS và tài liệu hiện có trong repo.

## Câu hỏi chưa giải quyết

Không thêm câu hỏi nghiệp vụ; cần xác nhận bằng QA rằng backend hiện tại khớp hợp đồng B1 đang hoàn thiện.
