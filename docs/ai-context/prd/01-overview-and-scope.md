# 01 — Tổng quan và phạm vi

## Sản phẩm
**OMTS — Oyster Management and Traceability System** cho **Hợp tác xã Nuôi trồng Thủy sản Trung Nam** (đồ án SEP490_G83). Repo này là cổng quản lý **Web** (Next.js App Router + TypeScript). Backend và Mobile ở repo riêng:
- Web: `thaideptrai218/omts-web`
- Backend: `thaideptrai218/omts-backend`
- Mobile: `thaideptrai218/omts-mobile`

Chữ giao diện: **tiếng Việt**. Vận hành chính: quản lý vùng nuôi, bè, chu kỳ nuôi, vật tư/mua hàng, nhân sự, bán hàng/công nợ, và **truy xuất nguồn gốc** hàu qua QR công khai.

## Hai chế độ dữ liệu
| Chế độ | Biến | Đặc điểm |
| --- | --- | --- |
| **Mock** (mặc định) | `OMTS_DATA_SOURCE=mock` | Không cần backend/DB/Redis; dữ liệu trong bộ nhớ, reset khi tải lại; Vercel production đang chạy chế độ này |
| **API** | `OMTS_DATA_SOURCE=api` | Đăng nhập thật qua BFF, quyền thật, cần backend + Redis ≥ 6.2 |

Mock và API dùng chung route; `ApiPage` chọn nội dung theo chế độ. Mock chỉ có đủ màn cho một phần (vd `/workspace/*` và phần lớn `/operations/*` trả 404 ở chế độ mock; chỉ `workforce`, `purchase-receipts`, `supplier-payments` có màn demo).

## Phạm vi đã có (theo mức hoàn thiện)
**Nối API thật:** đăng nhập/phiên/đăng xuất; hồ sơ cá nhân + đổi liên hệ qua OTP + thông báo; hồ sơ HTX, chứng nhận, tài khoản nhận tiền (VietQR); nhân viên thời vụ; tài khoản nội bộ và grant; vai trò (chỉ đọc); vùng nuôi, bè, giấy phép; chu kỳ nuôi, thả giống, vật tư, thu hoạch, nhật ký; nhà cung cấp, vật tư, phiếu nhập, thanh toán NCC, công nợ; đo nước (nhập tay/OCR); khách hàng, hóa đơn bán, thanh toán khách, công nợ khách; khiếu nại chất lượng; yêu cầu mua của thương lái; duyệt đăng ký thương lái; phân công/chấm công/nghỉ phép; hộp thư; nhật ký thao tác; truy xuất lô; trang công khai `/origin/[qrToken]`.

**Chỉ có khung (FRAME ONLY, chưa có nguồn dữ liệu):** bảng lương `payroll` (LABOR-10/11), phiếu trả hàng bán `sales-returns` (CLAIM-03), ba báo cáo bán hàng (REPORT-01/02/03).

**Chưa có / chờ backend:** luồng thu hoạch → bàn giao → bán hàng/thanh toán đầy đủ; kích hoạt liên hệ Staff; làm mới token; dashboard số liệu thật (Owner đang xem dữ liệu mẫu, có banner báo rõ); sửa/hủy hóa đơn (chờ nhánh `OMTS-224-correct-cancel`); khiếu nại chưa có danh sách hóa đơn của Trader (chọn qua `?invoiceId=`).

## Giới hạn phạm vi
- Không dựng Expo/mobile trong repo.
- Không dùng actor Household/Farmer.
- Chính sách vai trò: ba vai trò cố định (xem file 02).
- Vercel production chỉ chạy mock; chạy API thật trên Vercel cần backend HTTPS ổn định và Redis có TLS/xác thực.

## Tiêu chí thành công
- Mọi luồng role chạy đúng SRS; quyền suy ra từ grant hiệu lực, không từ tên vai trò.
- Dùng được ở 360 px và 1024 px; đủ trạng thái loading/empty/error/offline/success/syncing/permission-denied.
- `npm run lint`, `typecheck`, `test`, `build` đều qua.
- Không số liệu bịa: chưa biết thì hiển thị "Chưa có số liệu".
