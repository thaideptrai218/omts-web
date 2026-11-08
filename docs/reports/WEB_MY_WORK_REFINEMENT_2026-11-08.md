# Công việc cá nhân và nghỉ phép — 08/11/2026

## Thay đổi giao diện

- Bộ chọn khoảng ngày bên trái; giải thích rõ khoảng ngày chỉ lọc phân công/ngày công, nghỉ phép vẫn hiển thị toàn bộ như trước.
- Tên nhân viên và kỳ xem ở đầu nội dung, nút tải lại ở cùng hàng. Chỉ hiển thị liên kết đến phần phân công/ngày công/nghỉ phép khi có hồ sơ nhân viên.
- Chia các phần phân công, ngày công, nghỉ phép và lời mời ca theo mục rõ ràng. Số lượng ở mỗi mục lấy trực tiếp từ mảng dữ liệu API; không có KPI mẫu.
- Bảng responsive với nhãn cột trên mobile, ngày dd/MM/yyyy, badge tình trạng ngày công và nghỉ phép. Gộp ngày bắt đầu/kết thúc nghỉ vào một ô.
- Phân trang cục bộ 10 dòng cho ba bảng cá nhân và lời mời ca; không đổi query API. Giới hạn lại trang khi dữ liệu thu hẹp; phân công/ngày công về trang đầu khi đổi kỳ.
- Giữ nguyên thời hạn tối đa 63 ngày, xác nhận gửi/hủy, clientOperationId, quyền Staff, điều kiện hồ sơ liên kết, giữ nháp và xử lý kết quả chưa rõ. Không sửa thao tác hoặc quyền của lời mời ca.

## Kiểm tra

- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- Kiểm thử có sẵn: 2 ca leave/linked employee trong sales-workforce-write và 2 ca shift/invitation trong purchase-staffing: PASS (các ca ngoài bộ chọn không chạy).
- Browser đăng nhập tài khoản API `quanlyvung1` theo README, vào `/operations/my-work`; bộ chọn ngày và bố cục/error state render được. Không gửi/hủy nghỉ hoặc phản hồi ca thật.
- Tài khoản mock `manager` không phải username API của runtime; không sửa tài khoản/credential để vượt qua đăng nhập. Đã dùng đúng tài khoản được ghi trong README.
- **Blocker runtime:** API8082 trả 404 cho `/api/me/workforce?from=2026-11-01&to=2026-11-08` và `/api/me/purchase-shifts` cùng kỳ; browser qua BFF cũng báo không tìm thấy. Chưa xác minh bảng có dữ liệu, phân trang và mutation thật trên runtime này. Không suy luận API thiếu trên mọi branch backend.
- Ảnh trạng thái thực tế `.hallmark/my-work-runtime-2026-11-08.jpg` (ignored). Chưa đủ ảnh nghiệm thu bảng có dữ liệu ở các breakpoint.

## Tệp

- `src/features/operations/my-work-screen.tsx`
- `src/features/operations/my-work-screen.module.css`
- `src/features/operations/purchase-staffing.tsx` (chỉ MyPurchaseShifts: trình bày/phân trang)

Chưa commit, push hay merge. Giữ mọi thay đổi local trước đó. Đợt này hoàn thành phần code giao diện; chưa nghiệm thu trọn luồng API vì blocker nêu trên.
