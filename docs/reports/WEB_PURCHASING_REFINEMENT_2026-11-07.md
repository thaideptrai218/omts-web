# Đợt thiết kế Phiếu nhập và Thanh toán nhà cung cấp

## Phạm vi
Bản local dùng NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2. Chỉ chỉnh module purchasing-v2 đang chạy, không sửa màn legacy để tránh sai contract.

- Phiếu nhập: filter trái, bảng gọn, số tiền căn phải, ngày tiếng Việt, totals từ API ghi rõ phiếu hoàn thành, phân trang server10/20/50.
- Hồ sơ phiếu: dialogxl; trạng thái/NCC/người ghi nhận/tổng tiền ở đầu, bảng đối chiếu dòng đã hoàn thành, phần dữ liệu đã nhập mở rộng; nháp giữ form. Mỗi dòng chọn bè; không thêm invoiceupload hoặc thanh toán theo phiếu từ contract cũ.
- Thanh toán: filter NCC, tách công nợ toàn HTX và tổng giao dịch theo bộ lọc. Lịch sử server10/20/50; công nợ server20/trang; hàng chờ thanh toán client10/trang từ endpointdebt.
- Chọn NCC từ bảng công nợ lọc lịch sử và hàng chờ. LookupNCC dùng adapter phân trang hiện có; nếu lookup không khả dụng, dùng danh sáchNCC trong trang công nợ và giữ nhãnNCC đã chọn.
- Giữ create/update/return/cancel/confirmAdvance/confirmDuplicate/deduplicationKey/rowVersion và quyền/xung đột. Không tạo API hay gửi giao dịch kiểm tra.
- Lint/typecheck/build đạt. Chưa commit/push/merge.

## Browser QA
Owner API3002: danh sách tháng11 có7phiếu, mở PN000025 hoàn thành và bảng dòng10000con/10triệu thành công; thanh toán có25giao dịch, lọc BạchLong còn nợ24,9triệu với2phiếu chưa trả hết và3giao dịch. Không ghi trả hàng/hủy/thanh toán để kiểm UI. RuntimeAPI/SQL/Redis đã dừng lúc kiểm tra; khởi động lại container cũ và FE3002, health200, không reset dữ liệu.
