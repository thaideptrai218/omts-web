# Bảng vai trò → màn hình (20/11/2026)

Tờ đối chiếu "ai làm màn nào" cho Chủ HTX, Quản lý vùng (QLV) và Kế toán (KT). Nguồn: quyết định D1–D9 trong `plans/261120-1249-GH-227-role-screens-and-settings-hub/plan.md`, gate trong `src/features/operations/permissions.ts`, `resources.ts`, `api-workspace-shell.tsx`, ma trận backend `FixedRoles.cs` (đọc lại 20/11, đã bỏ bán hàng khỏi ZONE_MANAGER và mở phân công/chấm công đầy đủ).

**Ký hiệu:** **Xem** = chỉ đọc (kể cả xuất file) · **Làm** = tạo/sửa/xóa nghiệp vụ · **Duyệt** = phản hồi/chốt/xác nhận · **—** = không có màn. ⏳ = ô phụ thuộc thay đổi backend chưa xong hoặc chưa chốt; web đã theo quyết định nhưng backend có thể còn chặn/mở khác. Menu và nút luôn gate theo mã quyền hiệu lực, không theo tên vai trò; backend vẫn là nơi quyết định cuối.

## Nuôi trồng

| Màn | Chủ HTX | QLV | KT |
|---|---|---|---|
| Vùng nuôi, Bè | Làm | Xem (vùng được cấp) | Xem |
| Ươm giống | Làm | Làm | — |
| Bắt đầu chu kỳ nuôi (thả giống) | Làm | Làm | — |
| Hành trình / nhật ký chu kỳ | Làm | Làm | — |
| Chất lượng nước (đo, ngưỡng) | Làm | Làm (ngưỡng: Chủ) | — |
| Kế hoạch thu hoạch | Làm + Duyệt (lập từ đơn thương lái, giao QLV) | Xem kế hoạch được giao; không lập/sửa | — |
| Thu hoạch tại bè (tiếp nhận, thu, bàn giao lại) | Làm | Làm ⏳ (bước tiếp nhận/bàn giao D3) | — |
| Lô thu hoạch (cân, mở lại, đóng) | Làm | Làm (đóng có chênh lệch cần Chủ) | Xem (sản lượng) |
| Truy xuất lô, công bố nguồn gốc | Làm | Làm | Xem (truy xuất) |

## Vật tư & Giống, Mua hàng

| Màn | Chủ HTX | QLV | KT |
|---|---|---|---|
| Danh mục giống, vật tư | Làm | Xem | Xem |
| Lô giống | Làm | Xem (kèm đơn giá, D2) | Xem + xuất |
| Xuất dùng vật tư | Làm | Làm | Xem + xuất |
| Xuất hủy vật tư | Làm | — | Làm |
| Nhà cung cấp | Làm | Xem | Xem + xuất |
| Phiếu nhập giống/vật tư (thấy đơn giá) | Làm | Làm | Xem + xuất |
| Trả hàng nhập | Làm | Làm | Xem |
| Thanh toán nhà cung cấp, công nợ NCC | Làm | — | Làm |

## Nhân sự

| Màn | Chủ HTX | QLV | KT |
|---|---|---|---|
| Thiết lập nhân sự, kỳ lương | Làm | — | — |
| Nhân viên thời vụ (hồ sơ) | Làm (nhập/xuất file chỉ Chủ) | Làm trong vùng; không tạo thời vụ trong lịch vùng (D6) | Xem (không dữ liệu cá nhân/ngân hàng) |
| Phân công ngày công (lịch vùng) | Làm | Làm ⏳ (backend vừa mở cho QLV) | — |
| Chấm công, điểm danh hàng loạt | Làm | Làm ⏳ | — |
| Sửa chấm công (kỳ chưa chốt, bắt buộc lý do, D5) | Làm + Duyệt | Làm ⏳ | — |
| Duyệt nghỉ phép / yêu cầu nhân sự | Duyệt | Chưa chốt ⏳ (hiện chỉ Chủ) | — |
| Công việc và nghỉ phép của tôi | Xem | Xem + gửi yêu cầu | Xem + gửi yêu cầu |
| Loại công việc, đơn giá | Làm | — | Làm (PAY_RULES) |
| Bảng lương, thanh toán lương, chi phí nhân công | Làm + Duyệt (chốt lương) | — | Xem + xuất (lương tạm hoãn, D4: chưa có lát lương/kế toán lương) |

## Kinh doanh (bán hàng)

| Màn | Chủ HTX | QLV | KT |
|---|---|---|---|
| Đặt hàng, đơn thương lái | Làm | — (D1) ⏳ | Xem + xuất |
| Hóa đơn bán, trả hàng bán | Làm | — (D1) ⏳ | Xem + xuất hóa đơn; không lập/sửa/hủy |
| Khách hàng | Làm | — (D1) ⏳ | Làm (không xóa) |
| Yêu cầu mua của thương lái | Duyệt (nhận/từ chối) | — | — |
| Khiếu nại chất lượng | Duyệt | — | — |
| Danh mục sản phẩm hàu | Làm | — | Xem |
| Xuất hủy hàu | Làm | Làm | Xem + xuất |
| Thanh toán của khách, công nợ khách | Làm | — | Làm + Duyệt (xác nhận khoản chờ) |

## Tiền và báo cáo

| Màn | Chủ HTX | QLV | KT |
|---|---|---|---|
| Sổ quỹ, thiết lập sổ quỹ | Làm | — | Làm |
| Báo cáo Cuối ngày, Bán hàng, Hàng hóa, Khách hàng, NCC, Tài chính | Xem | — (D1) | Xem, toàn HTX |
| Báo cáo sản lượng nuôi | Xem | Xem vùng được cấp | Xem |
| Xu hướng giá, vấn đề sau bán | Xem | — | Xem |
| Tổng quan (/dashboard) | Số liệu bán + "Chờ chủ duyệt" | "Việc hôm nay trong vùng" | "Việc tiền hôm nay" + số liệu bán |

## Thiết lập và tài khoản

| Màn | Chủ HTX | QLV | KT |
|---|---|---|---|
| Hồ sơ HTX, ngân hàng nhận tiền, chứng nhận, nhật ký thao tác | Làm | — | — |
| Tài khoản nội bộ, vai trò và phân quyền vùng, đặt lại mật khẩu | Làm | — | — |
| Hồ sơ cá nhân | Làm | Làm | Làm |

Mỗi HTX có một Kế toán, xem mọi vùng; thêm người thứ hai chỉ cảnh báo, vẫn lưu được (D9).

## Các ô còn phụ thuộc backend (⏳)
1. QLV bỏ bán hàng (D1): `FixedRoles.cs` đã bỏ; web chỉ ẩn theo mã quyền nên khớp ngay khi backend triển khai.
2. QLV phân công, chấm công, sửa chấm công (D5): quyền WORK_ASSIGNMENTS/ATTENDANCE đã mở trong `FixedRoles.cs`; endpoint sửa chấm công và duyệt nghỉ có thể còn `RequireCooperativeOwner` nên QLV có thể bị 403.
3. Tiếp nhận và bàn giao kế hoạch thu hoạch (D3): thêm bước nếu backend chưa có; cần duyệt trước khi làm.
4. Kế toán vẫn có PAYROLL View/Export ở backend; web chưa làm màn lương cho Kế toán (D4).

## Câu hỏi còn mở
- QLV có duyệt nghỉ phép của người trong vùng không, hay chỉ Chủ?
- QLV đóng lô có chênh lệch (ownerApproved) có cần Chủ duyệt không?
