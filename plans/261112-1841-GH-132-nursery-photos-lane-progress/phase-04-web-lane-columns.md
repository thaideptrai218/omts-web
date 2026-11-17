# Phase 04: Web sơ đồ làn dạng cột ngang (W1)

**Người làm:** **Codex GPT-6.1 sol, reasoning high** (fallback Claude). **Ưu tiên:** P1. **Phụ thuộc:** không (dùng % suy ra từ trạng thái tới khi có Phase 03). **Trạng thái:** pending.

## Context
- Đặc tả mục 10.3, 10.6 (nhập % cũng ở form, màu đậm nổi bật). Thành phần hiện có: `src/features/farming-management/lane-overview*.tsx`, `lane-ranges.ts`, chế độ chọn và hoàn tất nhiều làn (`finish-harvest`), `rafts-api/lane-incidents-board.tsx`. Bộ màu token: `src/app/globals.css`, `docs/DESIGN_GUIDELINES.md`.

## Yêu cầu
- Thay lưới ô hiện tại bằng **các cột đứng xếp ngang kéo ngang** (làn 1..N), mỗi cột là thanh cao đổ màu theo %; cuộn ngang mượt, tiêu đề số làn dính, tìm "Tìm làn số…" nhảy tới, lọc theo trạng thái, đếm theo trạng thái.
- **Màu đậm, tương phản cao, có viền và nhãn %** (bản nhạt bị chê): chưa thả xám có viền rõ; **đã nuôi xanh lá đậm**; **đã thu xanh dương đậm**; đang thu cam; hỏng đỏ; ngừng hoạt động gạch chéo; phần đổ theo %. Màu lấy từ token (tạo token mới nếu thiếu), đạt tương phản chữ/nền.
- **Bấm một làn** mở popover: trạng thái, **% đã thả** và **% đã thu** (ô nhập số, không kéo), người sửa gần nhất, lịch sử, hành động sự cố (báo hỏng, sửa, ngừng, khôi phục) trong làn đã mở; lưu gọi `PUT .../lanes/{n}/progress` khi Phase 03 có (tolerant 404: ẩn ô sửa %).
- Dùng chung ở: chi tiết bè, tiến độ chu kỳ, form thả giống, form thu hoạch; giữ chế độ chọn nhiều làn và "Hoàn tất thu hoạch" nhiều làn.
- Hỗ trợ 100 làn: ảo hóa/cuộn, không giật; bàn phím mũi tên; chú giải nhỏ.

## Files
`src/features/farming-management/*`, `rafts-api` (bảng làn), `cycles-api/cycle-progress-tab.tsx`, `cultivation-api` (picker thả/thu), CSS module mới, token màu, test hàm thuần.

## Steps
1. Mô hình dữ liệu hiển thị làn (hàm thuần: ánh xạ trạng thái + % → màu/nhãn) + test.
2. Thành phần cột ngang + popover.
3. Thay ở các nơi dùng; giữ chế độ chọn.
4. eslint thư mục đổi, `tsc` một lần.

## Thành công
Một bè 100 làn hiện gọn, kéo ngang, màu rõ ở màn 1366 px, bấm làn thấy và sửa % (khi backend có); không còn khoảng trắng thừa.

## Rủi ro
Codex high chậm: giao prompt chi tiết một lần; hết hạn mức thì Claude tiếp quản từ log.

## Kiểm tra gọn
Không chạy test dài; eslint + `tsc` một lần + test hàm thuần.
