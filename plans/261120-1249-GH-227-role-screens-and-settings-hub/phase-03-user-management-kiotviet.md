# Phase 3 — Quản lý người dùng kiểu KiotViet (hướng A)

**Ưu tiên:** Cao · **Rủi ro:** Vừa · **Đụng:** web (+ 1 BFF route) · **DB:** không đổi · **Trạng thái:** Chờ

## Mục tiêu
Tạo và phân quyền 1 Manager trong **một màn, ≤ 4 bước**, thấy ngay ai làm được gì.

## Thiết kế
Màn `/workspace/accounts` → "Quản lý người dùng", 2 tab:
- **Tài khoản:** bảng kit quản lý; cột Tên, Tên đăng nhập, SĐT, **Vai trò**, **Vùng**, **Nhân viên liên kết**, Trạng thái; lọc theo vai trò/vùng/trạng thái; tùy chỉnh cột.
  - Nút **Tạo người dùng**: một form gồm thông tin + chọn nhân viên liên kết (tùy chọn) + vai trò + vùng → gọi `POST /api/accounts` với `Grants[]` inline (backend có sẵn). Kế toán → luôn "Tất cả vùng", cảnh báo nếu đã có Kế toán (OK để tiếp tục).
  - **Chi tiết** dạng drawer (không toggle ẩn): thông tin, khối **Phân quyền** (danh sách cặp vai trò–vùng, thêm, thu hồi), xem trước quyền (`permission-preview`), Ngừng/Cho hoạt động, **Đặt lại mật khẩu** (nối `POST api/accounts/{id}/reset-password`), **Sao chép người dùng** (tạo TK mới + chép grants).
  - Sau lưu quyền: nhắc "người dùng cần đăng nhập lại".
- **Vùng chung một chỗ (D8):** drawer hiện cạnh nhau "Vùng làm việc (hồ sơ nhân viên)" và "Phân quyền vùng (tài khoản)"; khi cấp QLV vùng X mà nhân viên chưa có X trong vùng làm việc → gợi ý thêm (1 nút).
- **Vai trò:** 2 thẻ Quản lý vùng / Kế toán, ma trận chỉ đọc (từ `GET /api/roles`), số người đang dùng (tính ở web từ danh sách tài khoản + grants).
- Hồ sơ nhân viên tab "Tài khoản": giữ cấp/liên kết, thêm link "Phân quyền" sang drawer.
- `/access/accounts`, `/access/roles` → redirect về `/workspace/*` (1 họ URL).

## File
- Tạo: `src/features/user-management/` — `user-management-screen.tsx`, `user-accounts-tab.tsx`, `user-roles-tab.tsx`, `user-create-form.tsx`, `user-detail-drawer.tsx`, `user-copy-action.tsx`, `accountant-uniqueness-warning.ts`; BFF `src/app/api/accounts/[id]/reset-password/route.ts` + `src/server/workspace/account-reset-password-http.ts`; test cho mỗi file logic.
- Dùng lại: `personal-api/account-grants.tsx`, `account-grant-add.tsx`, `role-read-view.tsx`, `grant-contract.ts`.
- Sửa: route `/workspace/accounts`, `/workspace/roles`, `/access/*` (redirect), `employee-account-tab.tsx` (link), hub settings.
- Xóa sau khi thay: khối toggle trong `farming-api/resource-extras.tsx` cho accounts; BFF `role-impact` nếu vẫn không dùng.

## Bước
1. Xác nhận DTO list accounts có/không có grants; nếu không, tải grants theo trang (giới hạn) hoặc hiển thị lười.
2. Tab Tài khoản + cột + lọc.
3. Form tạo với grants inline + cảnh báo Kế toán.
4. Drawer chi tiết + reset MK + sao chép.
5. Tab Vai trò.
6. Redirect URL cũ; test.

## Lát 3b — tài khoản nhân viên nội bộ (thêm 20/11, làm SAU khi lát chính xong, cùng file `employee-api/employee-account-*`)
Chủ dự án: cả (a) tab "Tài khoản" trong hồ sơ nhân viên và (b) tab "Nhân viên nội bộ" trong màn Chấm công.
- (a) Luồng một mạch: tạo nhân viên → cấp tài khoản → chọn vai trò + vùng ngay trong hộp thoại (gọi grants) → hiện mật khẩu tạm 1 lần. Cột "Tài khoản" ở danh sách nhân viên, cột "Nhân viên" ở danh sách tài khoản. Gỡ liên kết: cần endpoint backend (hiện chưa có) → hỏi trước khi thêm.
- (b) Tab "Nhân viên nội bộ" của màn Chấm công theo luật riêng (chấm công không cần phân công) → thống nhất với các tab khác; làm trong lát 7.2 "Chấm công hôm nay".

## Thành công khi
Owner tạo `quanlyvung2`, gán Vùng X, đặt lại mật khẩu, sao chép sang `quanlyvung3` — không rời màn.

## Rủi ro
- N+1 gọi grants cho bảng: chỉ tải grants trang hiện tại, cache theo phiên màn.
- Reset MK là hành động bảo mật: confirm dialog, mật khẩu tạm hiện 1 lần, BFF Owner-only.
