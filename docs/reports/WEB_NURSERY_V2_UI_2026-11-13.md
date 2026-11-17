# Web ươm giống theo mô hình V2 (N-A), 13/11/2026

Nguồn: `FARMING_NURSERY_MODEL_V2_2026-11-13.md`, mục 0 của `FARMING_NURSERY_API_CONTRACT_2026-11-12.md`.

## Đã làm
- Hoàn tất ươm: hộp thoại 2 bước (nhập, xem lại): số sống sót (ước tính, ≤ số vào, cho phép 0 kèm nhắc "không còn mảnh để thả"), ngày hoàn tất (`Field type="date"`), ảnh 1-3; hao hụt ước tính hiện ngay dưới ô. Không còn chọn bè, chia số mảnh, sản lượng dự kiến.
- Trạng thái 4001 Đang ươm, 4002 Đã ươm xong, 4003 Đã hủy, 4004 Đã đóng: nhãn, pill, bộ lọc (thêm "Đã đóng").
- Danh sách: cột "Đã thả", "Còn lại" ("Đã thả hết" khi 4002 còn 0; "—" cho 4001/4003).
- Chi tiết: khối "Kho ươm", "Đang dùng cho các bè" (`usage`, liên kết bè, Hành trình, Thả giống), ảnh, lịch sử gọn. Nút theo trạng thái: 4001 Chỉnh sửa / Hoàn tất ươm / Xóa đợt ươm; 4002 Sửa số sống sót (không thấp hơn đã thả) / Đóng đợt ươm (chỉ khi còn lại > 0, hộp xác nhận "N mảnh còn lại sẽ ghi là hao hụt (ước tính)", lý do tùy chọn).
- Lịch sử: nhãn `Closed` "Đóng đợt ươm", trạng thái 4004; sự kiện cũ `AllocationsChanged` vẫn đọc được.
- BFF/zod (`src/server/nursery/**`): bỏ `allocations`; thêm action `close` (POST `/api/nursery-batches/{id}/close`, quyền Edit, `reason?` + `rowVersion`), bộ lọc `closed`, schema phản hồi dung sai (`seeded`, `remaining`, `closedOn`, `closeLossPieces`, `usage`, `canClose`, `closedCount`, `remaining` ở summary). Multipart hoàn tất chỉ còn `survivors`, `completedOn`, `rowVersion`, ảnh. Mã lỗi `NURSERY_NOTHING_TO_CLOSE`, `NURSERY_SURVIVORS_BELOW_SEEDED` có chữ tiếng Việt.
- Xóa mã chết: allocation-*, raft-*, transfer-step, no-raft-notice, received-rafts, completion-messages cùng test. Test cập nhật/thêm: hao hụt, giới hạn sống sót ≥ đã thả, hộp thoại hoàn tất, hộp thoại đóng, bảng, chi tiết, hợp đồng đọc, plan BFF.
- Kiểm tra với backend thật (owner, DEMO-01) ở 1366 px: danh sách, chi tiết NU000007 (Kho ươm, Đang dùng cho các bè, Sửa số sống sót, Đóng đợt ươm), hộp xác nhận đóng (không bấm xác nhận), hộp hoàn tất NU000009 (không bấm xác nhận); không lỗi mạng/console, không còn chữ "phân bổ".

## Chưa làm / ghi chú
- Không thực hiện thao tác ghi thật (hoàn tất NU000009, đóng, xóa) theo chỉ đạo tiết kiệm.
- 360 px: không tràn ngang; bộ lọc của khung quản lý chung phủ lên danh sách ở bề rộng này (hành vi chung, không thuộc màn ươm), nên chưa chụp chi tiết/hộp thoại ở 360 px.
- Form bắt đầu chu kỳ vẫn dùng nguồn dữ liệu của N-B; không chuyển sang action `available` của BFF ươm (không làm bên này).
- `tsc`: không lỗi trong tệp ươm; còn lỗi ở `cultivation-api/seeding-contracts.test.ts` (nhóm N-C).

## Giả định
- `canClose` từ backend không dùng để ẩn nút; điều kiện hiện nút: 4002, còn lại > 0, quyền Edit trong vùng.
- `seeded` thiếu coi là 0; `remaining` thiếu suy ra `survivors − seeded` chỉ khi 4002.
