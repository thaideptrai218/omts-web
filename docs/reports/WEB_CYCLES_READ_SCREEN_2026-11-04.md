# Chu kỳ nuôi và sửa nhật ký thao tác

Nguồn contract: backend `origin/feature/OMTS-220-cycles`, `CultivationCycleDtos.cs` và `CultivationCyclesController.cs`.

- Màn `/farming/cycles`: chọn vùng, danh sách bè và chu kỳ hiện tại/gần nhất; mở lịch sử chu kỳ của bè; tra tiến độ làn theo ngày hoặc theo chu kỳ.
- BFF chỉ cho đọc, kiểm schema, tham số, phiên đăng nhập và quyền `CULTIVATION_CYCLES/View`; backend kiểm vùng thực tế. Không tạo dữ liệu thay thế khi API chưa tồn tại.
- Repository riêng cho màn; dùng bảng, dialog, bộ chọn vùng và trạng thái tải/lỗi chung.
- Sửa `/api/audit-events?id=...` bị từ chối do bộ kiểm query cũ; kiểm GUID, ngày, phân trang, duplicate và query không hợp lệ. Loại ngày rỗng trước khi chuyển upstream.

Phạm vi đợt này là tra cứu. Chưa có form mở/sửa/hủy chu kỳ, nhật ký chăm sóc hoặc thả giống. Để thử màn chu kỳ cần backend chạy branch cycles hoặc logs có các endpoint tương ứng; `develop` chưa đáp ứng. Để thử nhật ký thao tác cần branch audit-search.

Kiểm tra: typecheck, lint và build đạt (45 trang). Đối chiếu enum `BeingHarvested` và mã trạng thái làn `2001/2002` trực tiếp từ branch cycles. Không chạy kiểm thử nghiệp vụ/browser theo yêu cầu kiểm tra gọn.
