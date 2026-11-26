# Giao việc cho session phân quyền: lỗi Round 1 của tester (25/11/2026)

Nguồn: `Downloads\OMTS_Danh_sach_loi_Round1_25-11-2026.xlsx` (BUG-70…89, căn cứ SRS v6.2). Phần web không phụ thuộc quyền đã sửa xong ở nhánh `feature/OMTS-30-employee-types-purchasing-weighing` (chưa commit). Tài liệu này là phần còn lại: **ma trận quyền và BE**. Làm đúng gốc, không thêm cách tránh ở web.

## Quyết định của chủ dự án (mới nhất thắng ghi chú cũ)

| Vai trò | Quyết định |
|---|---|
| Quản lý vùng (QLV) | Giữ **Mua hàng**, nhưng mua hoặc đặt thì chỉ tạo **đề nghị**; **Chủ HTX duyệt** mới thành phiếu thật. Xem được vật tư và giống nhưng không nhập về trực tiếp. **Bỏ hẳn Kinh doanh.** Không xem nhà cung cấp là dữ liệu gốc của Chủ. |
| Kế toán | Làm việc kế toán, **thêm, sửa, xóa như Chủ HTX** ở khu kế toán: mua hàng (nhà cung cấp, phiếu nhập, xuất dùng), thanh toán, công nợ, **bảng lương và thanh toán lương (lập, sửa)**, báo cáo, khách hàng. **Xem** vùng, bè, giấy phép, chu kỳ, nhật ký, thu hoạch **và chất lượng nước**. Không thao tác bè và chu kỳ như QLV. |
| Chủ HTX | Mọi quyền. Tổng quan doanh thu toàn HTX chỉ Chủ HTX thấy. Gộp, xóa hồ sơ khách chỉ Chủ HTX. |
| Cảnh báo thay vì chặn | Sai quy tắc nghiệp vụ thì cảnh báo và cho tiếp tục; chỉ chặn khi thiếu dữ liệu hoặc server từ chối. |

## Ma trận hiện tại và mục tiêu (`OMTS.Application/Features/Authorization/FixedRoles.cs`)

| Chức năng | QLV hiện tại → mục tiêu | Kế toán hiện tại → mục tiêu |
|---|---|---|
| PURCHASE_RECEIPTS (phiếu nhập, lô giống) | Full → **Xem**; tạo qua đề nghị cần duyệt | Xem, Xuất → **Full** |
| SUPPLIERS | Xem → Xem | Xem, Xuất → **Full** |
| INPUT_ISSUES (xuất dùng) | Full → Full (ghi trong vùng) | Xem, Xuất → **Full** |
| PAYROLL | không có → không có | Xem, Xuất → **Xem, Tạo, Sửa, Xuất** (không Xóa; chốt bảng vẫn của Chủ) |
| CULTIVATION_CYCLES, CULTIVATION_LOGS, HARVESTS, HARVEST_LOTS | Full → Full | không có → **Xem** (mọi vùng) |
| WATER_MEASUREMENTS | Full → Full | không có → **Xem** (mọi vùng) |
| Vùng, bè, giấy phép (`rafts`, `zones`, `licenses`) | theo vùng được giao | không có → **Xem** (mọi vùng) |
| CUSTOMERS | không có → không có | Xem, Tạo, Sửa, Xuất → giữ; **không Xóa, không Gộp** |
| SALES_INVOICES, SALES_ORDERS, SALES_RETURNS, PROVENANCE | QLV hiện có Provenance → **bỏ Provenance và mọi Kinh doanh** | giữ như hiện tại |
| Tổng quan HTX (DASHBOARD_*) | không → không | không → không |

Lưu ý: tester quan sát QLV thấy cả hóa đơn, khách hàng, đơn đặt hàng, trong khi `FixedRoles.cs` không cấp các quyền đó. Cần kiểm tra BE và dữ liệu thật đang chạy (có thể là quyền cũ trong dữ liệu hay bản BE cũ) và đưa về đúng ma trận trên.

## Việc cần làm, theo lỗi

1. **BUG-73 (Cao):** QLV bỏ Kinh doanh; Mua hàng thành đề nghị cần Chủ HTX duyệt. Luồng duyệt chưa có, cần chốt 4 điểm với chủ dự án trước khi làm: phạm vi (phiếu nhập giống, vật tư hay cả hai; "đặt" là đặt nhà cung cấp hay nhập hàng đã mua), từ chối có lý do và sửa gửi lại được không, Chủ HTX duyệt có sửa số lượng và giá không, Chủ HTX và Kế toán vẫn tạo thẳng. Sau đó thêm trạng thái chờ duyệt ở BE, màn đề nghị và hộp duyệt ở web, và khối "Chờ chủ duyệt" ở Tổng quan.
2. **BUG-74 (Cao):** Kế toán đọc được bè, chu kỳ, nhật ký, đợt ươm, lô thu hoạch, nước (hiện trả 403); tạo được nhà cung cấp, phiếu nhập, xuất dùng.
3. **BUG-85 (Cao):** Kế toán mở được Bảng lương và Thanh toán lương (hiện 403) và lập, sửa theo bảng trên. Sửa lại ghi chú `Payroll is the Owner's…` (decision 19/11 Q2) vì chủ dự án đã quyết định khác ngày 26/11.
4. **BUG-82:** chặn Kế toán khỏi Tổng quan doanh thu toàn HTX ở BE (web đã ẩn).
5. **BUG-83:** menu Kế toán chỉ hiện mục mà quyền thực sự cho (web đã dùng chung nguồn quyền; BE phải cấp đúng như mục 3).
6. **BUG-84:** Kế toán không Xóa, không Gộp hồ sơ khách ở BE (web đã ẩn nút).
7. **BUG-88:** tài khoản vừa QLV vừa Kế toán mở Bè nuôi ở "Tất cả vùng nuôi" không được báo không có quyền: bè các vùng được giao thấy và sửa được, bè các vùng khác xem được nhờ quyền Kế toán (xong mục 2 là hết lỗi). Gộp quyền hai vai trò theo từng vùng.
8. **BUG-75:** sửa chuỗi tiếng Anh ở `/api/permission-functions` (tên chức năng): `CASH_BOOK`, `CASH_BOOK_SETTINGS`, `INPUT_ISSUES`, `INPUT_DISPOSALS`, `PRODUCT_DISPOSALS`, `SALES_ORDERS`, `HARVEST_PLANS` và mô tả vai trò ở `FixedRoles.cs` sang tiếng Việt.
9. **BUG-86:** nhật ký thao tác khi cấp quyền phải ghi vùng, vai trò, giá trị trước và sau (GBR-02).
10. **BUG-72 (BE nếu có):** SRS v6.2 không giới hạn số Kế toán; bỏ mọi chuỗi hay kiểm tra "chỉ 1 Kế toán". Web đã bỏ câu này.
11. **Ghi lý do khi cảnh báo phép đo nước:** API ghi phép đo chưa có trường lý do; chủ dự án trả lời **không cần**.

## Web đã làm (không cần làm lại)

- BUG-82 Tổng quan chỉ Chủ HTX, BUG-84 ẩn Gộp và Xóa khách với Kế toán, `operationAllowed` cho Kế toán ghi theo quyền PAYROLL (`src/features/operations/permissions.ts`).
- BUG-70 chọn nhiều vùng ở Bè nuôi và Chất lượng nước; BUG-76 đến 81, 87, 89, 72.
- Còn khi BE xong: kiểm tra lại BUG-88 và 83 trên web với `nhanvien.hethan` (QLV + Kế toán) và `ketoan`.

## Cách kiểm tra
Đăng nhập `owner`, `ketoan`, `nhanvien.hethan` (mật khẩu demo `Demo@1234`), mở từng màn trong bảng, đối chiếu ma trận quyền ở Cài đặt > Vai trò và quyền. Chạy test BE của ma trận và `fixed-role-contract.test.ts` ở web.

## Câu hỏi còn mở
Bốn điểm của luồng duyệt mua hàng ở mục 1.
