# PRD — OMTS Web

## Là gì
**OMTS — Oyster Management and Traceability System**: hệ thống quản lý nuôi hàu và truy xuất nguồn gốc cho **Hợp tác xã Nuôi trồng thủy sản Trung Nam** (đồ án SEP490_G83). Repo này là **Web** (cổng quản lý). Backend và Mobile ở repo riêng.

## Dành cho ai (actor theo SRS hiện hành)
| Actor | Việc chính trên Web |
| --- | --- |
| Cooperative Owner | Hồ sơ HTX, nhân sự, tài khoản, vai trò/quyền, vùng nuôi, bè, duyệt Trader |
| Zone Manager | Vận hành vùng được gán: phiếu nhập, đo nước, chu kỳ nuôi |
| Accountant | Xử lý phiếu nhập, công nợ, thanh toán (toàn HTX) |
| Staff | Quyền theo grant vùng–vai trò, ban đầu không có quyền nghiệp vụ |
| Trader | Đăng ký, yêu cầu mua, xem hồ sơ |
| System Administrator | Quản trị hệ thống |
| QR Viewer | Trang truy xuất công khai (chưa hoàn thiện) |

Không đưa lại actor Household/Farmer từ báo cáo cũ nếu SRS và Jira chưa thêm.

## Phạm vi
- Có: đăng nhập/phiên qua BFF, quản lý HTX, nhân sự, tài khoản, 3 vai trò vùng cố định (Zone Manager, Accountant, Staff), vùng nuôi, bè, phiếu nhập, nhà cung cấp, đo nước, công nợ, nhân sự theo vùng, hộp thư, yêu cầu Trader.
- Chưa: trang QR công khai hoàn chỉnh, một số luồng chờ backend (thu hoạch → bàn giao → bán hàng/thanh toán, kích hoạt liên hệ Staff, refresh token).
- Hai chế độ dữ liệu: **mock** (mặc định, không cần backend) và **API** thật.
- Toàn bộ chữ giao diện là **tiếng Việt**.

## Tiêu chí thành công
- Mọi luồng role chạy đúng SRS; quyền suy ra từ grant thực tế, không từ tên vai trò.
- Dùng được ở 360 px và 1024 px; có đủ trạng thái loading/empty/error/denied.
- `lint`, `typecheck`, `build` đều qua.
