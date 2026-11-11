# 04 — Phân quyền

## Nguyên tắc
- Staff có thể có **nhiều** grant vùng–vai trò. Không suy quyền hiệu lực từ một tên vai trò.
- Menu và cổng UI dựng từ quyền hiệu lực + phạm vi (`/me/permissions`).
- Cổng frontend chỉ để điều hướng/phản hồi; **backend ủy quyền mọi API được bảo vệ**.
- `workspace.overview.view` chỉ mở trang; mỗi ô KPI cần function, action và scope riêng (WEB-API-06).
- OwnRecords phải khác AssignedZone (WEB-API-06).

## Vai trò cố định (WEB-ROLE-01, 27/10/2026)
- Chỉ ba vai trò vùng: **Zone Manager, Accountant, Staff**.
- Owner sửa quyền và ngừng/kích hoạt lại vai trò; **không** thêm/sao chép/đổi tên.
- Staff mới ban đầu không có quyền nghiệp vụ.

## Đồng bộ backend PR #21/#23/#22 (D1–D3, duyệt 02/11/2026)
- **D1**: backend có hai vai trò (ZONE_MANAGER, ACCOUNTANT); ma trận vai trò chỉ đọc; grant chỉ Effective hoặc Revoked, không ngày hiệu lực; vai trò `LEGACY-*` chỉ xem.
- **D2**: catalog thông báo theo loại; Web và Mobile đều sửa được Push tùy chọn; loại bắt buộc khóa bật. Thay thế quyết định cũ "Push chỉ đọc trên Web".
- **D3**: danh mục mua hàng nhóm Seed/Material/Other, `next-code`, `/resume`, địa chỉ/email nhà cung cấp.
- Rủi ro di chuyển: grant có ngày hoặc vai trò đã ngừng có thể sống lại khi bỏ ngày hiệu lực; khi tích hợp phải dừng thay vì mở rộng quyền.

## Luồng kế toán (03/11/2026)
- Mỗi HTX có một Owner và một Kế toán; Kế toán phạm vi toàn HTX.
- Manager gửi phiếu nhập thẳng Kế toán xử lý; Owner chỉ nhận thông báo, không có bước accept.

## Phạm vi theo quyết định khác
- Vùng nuôi: chỉ Owner tạo/sửa/ngừng/khôi phục; Manager đọc trong phạm vi (WEB-ZONE-01/02).
- Bè: chỉ Owner ghi; quyền View chỉ đọc trong phạm vi (RAFT-DEC-01/02).
- Hoạt động Manager: nhật ký chỉ đọc theo vùng; đánh dấu thu hoạch theo làn/phần trong vùng được gán, không thêm/xóa cấu trúc.
