# Quyết định chuyển luồng mua hàng sang API mới

Ngày: 06/11/2026.

Người dùng đã xác nhận: **Áp dụng đầy đủ luồng API mới** sau khi được thông báo các khác biệt:

- Phiếu nhập không gắn một vùng chung; bè nằm trên từng dòng giống/vật tư.
- Phiếu nhập không còn nhận file hóa đơn trong controller mới.
- Thanh toán ghi riêng theo nhà cung cấp; hỗ trợ khoản chi và tiền nhà cung cấp trả lại.
- Chi vượt công nợ cần xác nhận trả trước; mã ngân hàng trùng cần xác nhận đã đối chiếu.

Frontend giữ màn cũ cho runtime cũ; cấu hình `NEXT_PUBLIC_OMTS_PURCHASING_CONTRACT=v2` chọn màn/BFF mới cùng nhau. Biến này cần có trước build. Quyền mới theo NoZone của controller, cùng các điều kiện bản ghi mà backend kiểm (nháp của người tạo, trạng thái phiếu, bè của vùng được phép).

Quyết định này thay phần gắn vùng/file hóa đơn và thanh toán gắn từng phiếu của adapter cũ khi chạy chế độ v2. Không thay luồng yêu cầu mua thương lái (số lồng/staffing) đã chốt riêng.

Kết quả runtime và phạm vi đã nối: [hướng dẫn demo](../reports/MEETING_API_DEMO_2026-11-06.md).
