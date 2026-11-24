# Phase 0 - Quyết định đã chốt, mặc định chờ trả lời, trạng thái

## Đã chốt (user, 19/11/2026)
- Truy xuất **không** thêm ươm và vật tư (dữ liệu nội bộ). Không đưa vào trace nội bộ lẫn trang công khai.
- Tên HTX: "HTX Thủy sản Trung Nam" (viết tắt "HTX Trung Nam"); **mọi nơi** đọc từ hồ sơ HTX trong Cài đặt, không hardcode. Đổi trong Cài đặt thì mọi chỗ đổi theo.
- Làm theo hướng KiotViet nhưng chỉ phần web; bỏ Zalo, máy vân tay, BHXH/TNCN, phòng ban/chức danh, hoa hồng bán lẻ, mẫu lương, sửa tay số bảng lương.
- Không test dài, không CI. Mỗi phase: `tsc` + eslint file đã sửa, `dotnet build` (Docker), smoke bằng curl/headless. Chỉ viết 1-2 test nhỏ khi sửa **công thức tiền/giờ** (A1, A2, A5).
- Đã chốt từ trước: nghỉ cố định 1 giờ (một tổng); hủy đợt ươm hủy phân công tự tạo; người đã ra về chọn lại được.

## Mặc định khi user chưa trả lời (ghi `SRS_DEVIATIONS` khi áp)
| # | Câu hỏi | Mặc định |
|---|---|---|
| Q1 | Chi phí lương trong Tài chính: gross hay net? | Gross (`MainPay + Bonus`) |
| Q2 | Kế toán xem bảng lương, phiếu lương, chi phí nhân công, danh sách NV (không ghi)? | Có; thanh toán/chốt chỉ Owner |
| Q3 | Ca qua đêm theo ngày bắt đầu, ra về ≤18 giờ sau giờ vào; chọn lại sau ra về không trả giờ nghỉ giữa hai phiên | Có |
| Q4 | Hủy phiếu chi lương/tạm ứng từ Sổ quỹ | Cấm |
| Q5 | Phase C làm mục nào | Chưa làm cho tới khi user chọn |
| Q6 | Nghỉ việc tự khóa tài khoản liên kết | Có, sau hộp xác nhận |
| Q7 | Xóa file endpoint truy xuất cũ (`PublicOriginService`, `IPublicOriginQuery`, `PublicOriginQuery`, `PublicOriginView`, `PublicOriginTests.cs`) | Có (endpoint đã gỡ, test sẽ vỡ) |
| Q8 | Logo/ảnh bìa HTX trong Cài đặt thay ảnh thương hiệu cố định ở trang công khai | Có (đã là dữ liệu công khai của HTX) |

## Truy xuất - đã làm (19/11, chưa commit) và đã kiểm
- Gỡ `/api/origin/{token}` (404) · BFF chuyển IP/secret · token sai trả 404 thật · kg cân cảng ở trace nội bộ · lọc phiên thả theo chu kỳ + ngày ≤ ngày thu hoạch · tên HTX từ `GET api/public/cooperative-brand` (đã kiểm: tiêu đề + header trang công khai đúng) · DB đã đổi tên.
- Chưa kiểm: quét QR bằng điện thoại, nhãn in, đổi tên trong màn Cài đặt.
- Lỗi phát hiện khi rà plan: agent viết bộ mã QR mới `src/features/invoice-qr/qr-encoder.ts` trong khi repo **đã có** bộ mã đã dùng cho VietQR (`src/features/sales-invoices/qr-code-matrix.ts` + `qr-code-image.tsx`). Phải dùng lại (DRY) - xem T1.
