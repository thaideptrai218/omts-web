# Màn Nhà cung cấp theo DESIGN_GUIDELINES (09/11/2026)

Ghi lại các điểm khác hoặc bổ sung so với SRS khi dựng lại màn Nhà cung cấp. Người dùng đã duyệt phạm vi backend; các mục "cần xác nhận" là mặc định đang chạy, đổi được.

## Đã theo quyết định của người dùng

- Danh sách, bộ lọc, xuất/nhập file và thao tác hàng loạt theo `docs/DESIGN_GUIDELINES.md`.
- Nhóm Giống/Vật tư/Khác dùng `SupplierType` hiện có, không thêm bảng nhóm.

## Khác hoặc mở rộng so với SRS

| Nội dung | SRS | Đang làm | Trạng thái |
|---|---|---|---|
| Quyền xuất file nhà cung cấp | Hàm `SUPPLIERS` chỉ có View/Create/Edit (PURCHASE-07) | Thêm action `Export`. Quản lý vùng có do giữ toàn bộ hàm; Kế toán chỉ có View nên chưa xuất được | Cần xác nhận có cấp Export cho Kế toán không |
| Tổng mua trên danh sách | Chưa định nghĩa | Tổng phiếu nhập Hoàn thành, chưa trừ trả hàng; có kỳ thì chỉ tính trong kỳ. Hiện theo quyền `PURCHASE_RECEIPTS` View | Cần xác nhận cách tính |
| Nợ hiện tại trên danh sách | Thuộc PURCHASE-04 | Chỉ trả về cho quyền `SUPPLIER_PAYMENTS` View (BR-FARM-07). Không có quyền thì trường là null, sắp xếp/lọc theo nợ bị từ chối 403 | Theo SRS |
| Trường mới: mã NCC, khu vực, phường/xã, ghi chú, công ty, MST, CCCD | Không có trong PURCHASE-07 | Thêm, đều tùy chọn trừ mã tự sinh `NCC000001` | Người dùng đã duyệt |
| Kiểm tra MST / CCCD | Chưa có | MST 10 số, có thể thêm `-xxx`, hoặc 12 số; CCCD đúng 12 số | Cần xác nhận |
| CCCD | Chưa có | Chỉ trả ở chi tiết; không có trong danh sách, file xuất, file nhập và nhật ký kiểm toán | Theo yêu cầu bảo vệ dữ liệu cá nhân |

## Chưa làm

Xóa nhà cung cấp, Điều chỉnh công nợ, Chiết khấu thanh toán: chưa có backend và ngoài phạm vi đã duyệt.
