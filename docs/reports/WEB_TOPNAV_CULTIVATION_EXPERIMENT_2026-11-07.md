# Thử nghiệm điều hướng ngang và luồng nuôi trồng — 07/11/2026

Nhánh: `experiment/wireframe-cycle-redesign-20261107`. Chưa commit/push/merge.

## Phạm vi
- Thay sidebar bằng thanh nhận diện, chuông, tài khoản và menu ngang theo nhóm cho hai chế độ dữ liệu.
- Giữ nguồn menu/quyền hiện hữu; dropdown mở bằng click, hỗ trợ Escape, đóng khi chọn hoặc bấm bên ngoài.
- Tab nghiệp vụ nuôi trồng: Chu kỳ → Thả giống → Vật tư → Thu hoạch → Đo nước.
- Chu kỳ dạng bảng, lọc trái, mở hồ sơ ngay dưới dòng, chọn làn xem chi tiết bên phải.
- Liên kết từ hồ sơ sang thả giống/vật tư giữ zoneId/raftId; dữ liệu và quyền vẫn do API kiểm soát.
- Thu gọn mật độ màn ghi nhận và làn nuôi; trạng thái bè/ ngày trong bảng hiển thị tiếng Việt.

## Runtime và kiểm tra
- Docker Desktop đã mở; khởi động lại SQL `omts-latest-qa-sqlserver-1`, Redis `omts-web-session-redis`, backend `omts-meeting-20261106-api`.
- API8082 health200. FE API chạy http://localhost:3002 bằng npm run dev:api.
- Browser: Owner đăng nhập API thành công; vùng Ngọc Vừng trả 10 bè; mở hồ sơ B1-01, chuyển liên kết sang màn Thả giống giữ vùng/bè.
- Lint, typecheck, build thành công. Chỉnh CSS selector nút trong dòng chi tiết sau kiểm tra render.
- Chưa kiểm CRUD sâu hoặc toàn actor; đây là một luồng thử nghiệm để người dùng duyệt thiết kế, chưa áp toàn bộ ảnh tham khảo sang mọi màn.
- Không reset DB/volume hoặc tạo giao dịch nghiệp vụ để thử giao diện.

## Refinement đợt 1 — khung trang và topnav
- Căn chung nhận diện, menu và nội dung trong container tối đa 1440px; lề trong 48px desktop, 32px màn vừa và 12–18px mobile.
- Giảm sắc độ/độ đậm topnav, active dùng nền và gạch mảnh; tab phụ nằm trong trục nội dung.
- Giảm viền xanh bao hồ sơ, dùng đường nhấn nhạt bên trái.
- Filter rail chuyển sang cột trái từ 960px để tránh danh sách bè chiếm toàn chiều ngang trên tablet ngang.
- Yêu cầu tiếp theo đã ghi nhận: Owner cần dashboard báo cáo tổng hợp, có thể dùng dữ liệu minh họa được gắn nhãn trong khi chờ API. Chưa triển khai dashboard trong đợt này để người dùng duyệt khung trước.

## Refinement đợt 2 — nội dung hồ sơ mở rộng
- Giữ nguyên khung/bộ lọc/bảng và mở rộng dưới dòng bè.
- Cụm Chu kỳ, Ngày xem, Xem tiến độ dùng grid responsive; hành động phụ gom thành một hàng.
- Tiến độ làn bên trái, kế hoạch chu kỳ bên phải; mobile xếp dọc.
- Component CycleLaneDetail riêng cho màn này dùng nguyên lane-progress repository/schema hiện có. Thẻ lần thả có aria-pressed, focus, selected; chọn thẻ mở chi tiết từ payload hiện có, không gọi endpoint mới.
- Giữ toàn bộ trường ngày/lô/NCC/số lượng, bổ sung trình bày phiếu nhập và mặt hàng đã có trong payload. Không đổi CRUD/quyền.
- Lint/typecheck/build đạt; không kiểm ghi dữ liệu nghiệp vụ.
