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

## Bàn giao kế hoạch thu hoạch và phân công nhân sự ngay (quyết định 24/11/2026)

**Kế hoạch thu hoạch.** Luồng: Phiếu tạm, Đã giao QLV (Chủ bấm Giao QLV), Đã nhận (quản lý vùng bấm Nhận kế hoạch), Đang thu (lô đầu tiên hoặc luống đầu tiên không thu), Đã bàn giao (quản lý vùng bấm Bàn giao cho chủ khi mọi bè trong kế hoạch đã xong), Hoàn thành (chỉ Chủ bấm Hoàn thành, chỉ từ Đã bàn giao). Hủy được khi còn Phiếu tạm, Đã giao QLV hoặc Đã nhận mà chưa có lô. Nút Nhận kế hoạch, Bàn giao cho chủ và Hoàn thành chỉ hiện khi `allowedActions` của kế hoạch có `Receive`, `HandOver`, `Finish`; thu hoạch và đánh dấu không thu chỉ khi kế hoạch Đã nhận hoặc Đang thu. Mỗi trạng thái có một dòng gợi ý việc kế tiếp theo người xem (Chủ hoặc quản lý vùng). Màn Tổng quan của quản lý vùng ghi "Cần nhận", "Đang thu" hoặc "Chờ bàn giao" cho từng kế hoạch; của Chủ có ô "Chờ chủ hoàn tất" liệt kê kế hoạch Đã bàn giao. Màn thu hoạch của bè có nút Nhận kế hoạch cho kế hoạch đã giao mà chưa nhận.

**Phân công nhân sự cho yêu cầu mua.** Chủ lập "Kế hoạch nhân sự" ngay trong chi tiết yêu cầu mua: số lồng cần lấy (không vượt số lồng yêu cầu), ngày lấy hàng và nhân viên trong phạm vi (có ô tìm). Bấm Lưu kế hoạch nhân sự là nhân viên được phân công và báo ngay, không phải đồng ý; yêu cầu vẫn ở Chờ phản hồi (không còn bước Chờ nhân viên cho yêu cầu mới; yêu cầu cũ ở trạng thái đó hiện như Chờ phản hồi và vẫn trả lời được). Nút Chấp nhận chỉ bật khi đã có kế hoạch nhân sự. Sau khi lưu, số lồng và ngày được giữ nguyên, Chủ chỉ chọn thêm được nhân viên cho đến khi chấp nhận. Ngày làm việc lấy bằng ngày lấy hàng; năng suất mỗi người mỗi ngày tính từ số lồng chia số người. Kế hoạch ngày làm việc của yêu cầu (bè, loại việc, người phụ trách) vẫn phải có trước ở backend.

## Các ô còn phụ thuộc backend (⏳)
1. QLV bỏ bán hàng (D1): `FixedRoles.cs` đã bỏ; web chỉ ẩn theo mã quyền nên khớp ngay khi backend triển khai.
2. QLV phân công, chấm công, sửa chấm công (D5): quyền WORK_ASSIGNMENTS/ATTENDANCE đã mở trong `FixedRoles.cs`; endpoint sửa chấm công và duyệt nghỉ có thể còn `RequireCooperativeOwner` nên QLV có thể bị 403.
3. Tiếp nhận và bàn giao kế hoạch thu hoạch (D3): đã có ở backend và web (xem mục trên).
4. Kế toán vẫn có PAYROLL View/Export ở backend; web chưa làm màn lương cho Kế toán (D4).

## Câu hỏi còn mở
- QLV có duyệt nghỉ phép của người trong vùng không, hay chỉ Chủ?
- QLV đóng lô có chênh lệch (ownerApproved) có cần Chủ duyệt không?
