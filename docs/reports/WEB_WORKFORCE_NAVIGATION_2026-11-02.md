# Màn phân công/chấm công và nhóm sidebar — 02/11/2026

## Màn Web đã có và nối API

`/operations/workforce` render `WorkforceScreen` với form chọn vùng, bè, loại công việc, ngày và nhiều nhân viên; lưu phân công, chuyển phân công có xác nhận, đổi việc trong ngày, gỡ phân công và vào/ra làm theo quyền. Owner thêm loại việc, thiết lập chấm công và duyệt/từ chối nghỉ phép. Lệnh ghi qua repository → BFF → backend thật, kiểm scope/session, giữ nháp khi lỗi và không tự gửi lại kết quả chưa rõ.

Đợt này bổ sung lọc vùng, tìm theo nhân viên/bè/công việc, cột vùng và số phân công/nhân viên đang xem. Lọc chỉ tác động dữ liệu đã đọc của ngày, không phát lệnh ghi, không làm mất ngày làm việc; có xóa bộ lọc và thử lại lookup vùng. Vùng picker theo quyền workforce và các bản ghi đã được backend trả.

## Sidebar

- Cả sidebar giao diện hiện tại và API đều dùng nút nhóm có mũi tên nhỏ, aria-expanded/aria-controls và hỗ trợ bàn phím. Mặc định mở, mỗi nhóm mở/thu độc lập.
- Khi sidebar gọn chỉ còn icon, các liên kết vẫn truy cập được dù nhóm từng bị thu; tiêu đề nhóm được bỏ khỏi tab order.
- API chia Nuôi trồng, Vật tư & mua hàng, Nhân sự & phân quyền, Kinh doanh; phân công/chấm công và công việc cá nhân nằm trong Nhân sự & phân quyền. Nhóm không có mục được phép không hiện. Các quyền Owner/Manager/Accountant/Trader vẫn do kiểm tra hiện có quyết định.
- Browser local3000 Owner demo: đăng nhập, tên Ngô Nam Trung, chọn Nuôi trồng thu lại mất các liên kết con, mở lại hiện đúng; nhóm khác giữ nguyên. Ảnh tại docs/learning/sidebar-groups-20261102.png (local, ignored).
- Mobile360: mở drawer, thu nhóm Nhân sự & phân quyền ẩn các liên kết con, đóng drawer thành công.1024: hiển thị sidebar desktop và các nhóm. Đã reset viewport về mặc định sau kiểm tra.

## Kiểm tra code

49 tests PASS (5 files): menu/group compact và giữ quyền, form ghi phân công/giữ nháp, bộ lọc mới, sales/workforce BFF plans. Lint, typecheck và build41 routes PASS; build dùng copy riêng để không ghi `.next` của dev3000. Chưa tính kiểm tra thành role end-to-end với backend thật trong môi trường hiện tại.

## Giới hạn môi trường

Local3000 đang OMTS_DATA_SOURCE=mock, nên sidebar API và /operations/workforce không chạy trong phiên mock đó. Không thêm mock workforce hoặc đổi session/cookie để dùng dữ liệu giả như API thật. Không tự thay env, mở dịch vụ, tạo API hoặc merge. Backend/Redis local chưa sẵn sàng theo lần kiểm trước; cần cấu hình API đầy đủ để tester phân công thật. UI test không thay cho xác nhận browser đã lưu phân công qua backend.

Nhật ký Manager chỉ được note contract theo quyết định mới của người dùng; không tạo endpoint nhật ký trong đợt này.
