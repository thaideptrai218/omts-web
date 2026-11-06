# QA3003 — hủy phiếu sau đối chiếu và tệp chờ upload

Ngày30/10/2026, tiếp nối [ca biên theo role](WEB_BROWSER_ROLE_EDGE_QA_2026-10-30.md). Chỉ Web3003/backend8081/RedisDB3; không merge hoặc ghi nghiệp vụ vào DB8080. Backend fetch vẫn develop953f597/Zalo dc00b2f.

## Xung đột thật giữa hai tab quản lý vùng1

Tạo phiếu QA riêng `PR-20261030-031`, vùng Ngọc Vừng, supplier `QA browser Manager2 20261030`, không hàng/không tiền. Không sửa phiếu nháp seed019.

Hai tab đọc cùng phiên bản031. A lưu ghi chú; B chọn Hủy, nhập lý do và xác nhận. Backend từ chối MSG06; lý do giữ nguyên, nút ghi bị chặn. Tải đối chiếu hiển thị ghi chú A; GET không tự bỏ chặn. Sau explicit “Đã đối chiếu, giữ bản nháp để sửa tiếp” và xác nhận hủy lần nữa, UI cũ vẫn gửi phiên bản đầu, tiếp tục MSG06.

Nguyên nhân: Save/Complete đọc baseline đã được người dùng duyệt, nhưng ReceiptAction hủy dùng record.rowVersion từ lúc mở. Sửa parent callback tạo payload cancel với baseline hiện tại tại thời điểm xác nhận; không thay lý do/cách xử lý tiền. GET không cập nhật baseline; không auto-retry hoặc đổi conflict policy. Return payload giữ nguyên.

Regression source cũ gửi AQID thay REVIEWED; sau sửa kiểm GET vẫn khóa/không ghi, explicit adoption giữ lý do/không ghi, xác nhận mới gửi REVIEWED và đúng lý do. Không đọc ref lúc render hoặc suppress lint.

## Tệp hóa đơn chưa tải lên

Trên cùng phiếu QA, chọn một PNG QA cục bộ: Tải hóa đơn lên enabled nhưng chưa bấm upload. Close cũ đóng ngay và mất lựa chọn. Bổ sung files.length vào guard bỏ nháp khi đóng; Quay lại giữ FileList và nút upload, Đồng ý mới đóng. Không tự upload, đổi file validation hoặc endpoint. Regression cũ fail vì onClose được gọi ngay; source sửa qua test không phát write/upload khi chỉ đóng.

## Xác minh

Nhóm operations/action-dialog4files26PASS, lint/typecheck/build41routes và61built-product assertions PASS. Snapshot full2885 của commit trước không gắn thành kết quả full source mới. Không sửa source sau build/replay dưới đây.

| Role | Browser bản build cuối |
| --- | --- |
| Manager DEMO-01 | Tệp chờ upload → Đóng hỏi xác nhận → Quay lại giữ nút Tải hóa đơn lên enabled → Đồng ý mới đóng; không upload. Hai tab đọc031, A lưu ghi chú mới, B hủy bản cũ MSG06; GET→explicit reviewed→xác nhận lại hủy thành công, đúng lý do |
| Manager DEMO-02 | Lọc All tìm phép đo QA08:32 có v2 đã hủy; mở v1 đã hiệu chỉnh: pH/mặn disabled, không có Hiệu chỉnh/Hủy; chuyển lại v2 đã hủy đúng trạng thái. Không sửa phép đo |
| Kế toán | Phiếu028đã hủy chỉ đọc, không nút lưu/hủy/copy; tải hóa đơn1 nhận download thực JPEG20.003bytes |
| Owner | Đọc lại031Đã hủy, phải trả/còn nợ0; ghi chú `QA receipt conflict final tab A saved`, lý do `QA cancel after explicit comparison` đúng canonical |
| Trader QA | Email verified và phone verified đăng nhập riêng lần lượt cùng về `tr40783326`, menu đúng Trader; logout giữa lượt và cuối cùng. Không đổi mật khẩu/liên hệ |

Phiếu031 cuối cùng Cancelled, không hàng/không tiền/không ảnh upload. Không thay fixture seed, quyền, thông tin HTX hoặc businessdata8080. Console đọc cuối Manager2 và Trader không có error/warn. Các phiên đều đã logout. Kiểm ở viewport mặc định1280; không nhận là lượt360/1024 mới hoặc mọi race đã chạy. Password/contact Save vẫn chưa chạy browser theo lựa chọn trước của người dùng; các role chưa có fixture/contract và APIv2 giữ nguyên blocker.

Ảnh task outputs: `qa-receipt-reviewed-cancel-still-conflicts.png`, `qa-receipt-reviewed-cancel-success.png`, `qa-receipt-pending-invoice-retained.png`, `qa-manager2-water-history-readonly.png`. Test FileList được kiểm tự động; browser xác nhận trạng thái có thể upload sau Quay lại, không đưa file lên chỉ để làm bằng chứng.
