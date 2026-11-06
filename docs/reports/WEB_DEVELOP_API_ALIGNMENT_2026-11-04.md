# Đối chiếu Web với backend `develop` ngày 04/11/2026

Nguồn: `omts-backend@origin/develop` (`dec1de2`). Đợt cập nhật gần nhất chỉ thay vai trò cố định và ma trận quyền. Các API chu kỳ nuôi, nhật ký chăm sóc, nhật ký hệ thống, thu hoạch và giao dịch vẫn nằm ở nhánh tính năng hoặc chưa có trên `develop`; chưa mở màn ghi dữ liệu cho chúng.

## Màn đã có trên Web cho API `develop`

- Vùng nuôi và giấy tờ vùng; bè nuôi và tình trạng bè; nhân viên; tài khoản, vai trò và phạm vi quyền.
- Nhà cung cấp và chứng nhận (xem, tải lên, tải xuống); danh mục vật tư; phiếu nhập và trả hàng; chi phí vật tư theo bè; thanh toán và công nợ nhà cung cấp; đo nước, ngưỡng và biểu đồ.
- Hồ sơ hợp tác xã, hồ sơ cá nhân, bảo mật và xác minh.

## Tương thích vừa sửa

- Khôi phục nhà cung cấp/vật tư gọi `POST .../reactivate`, đúng với `develop`. Nhánh danh mục mới cũng giữ alias này trong một kỳ chuyển tiếp.
- Form thêm vật tư vẫn cho nhập mã và đơn vị khi `GET .../next-code` trả 404 trên `develop`; khi API có sẵn, mã gợi ý và đơn vị giống tiếp tục hoạt động.
- Không mở xóa chứng nhận nhà cung cấp: API hiện chỉ nhận vị trí `index`, thiếu ID/version nguyên tử; giữ quyết định D3 tại `docs/decisions/WEB_BACKEND_21_23_ALIGNMENT_PROPOSAL_2026-10-31.md`.

Kiểm tra gọn: lint, typecheck và build đạt. Không chạy kiểm thử nghiệp vụ hoặc browser trong đợt này theo yêu cầu ưu tiên tốc độ. Việc mở các màn còn thiếu phụ thuộc API tương ứng được merge vào backend `develop` và chốt contract.
