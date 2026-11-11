# 04 — Câu hỏi mở và chặn

## Quyết định mở / hoãn (`docs/decisions/OPEN_QUESTIONS.md`)
- **WEB-AUTH-02**: hình dạng hợp đồng cổng sau đăng nhập (tên trường, thời điểm token, route đích, payload `/me/permissions`) — hoãn.
- **WEB-API-01 (phần mở)**: nhà cung cấp triển khai, độ bền/failover Redis production, vòng đời khóa production, kho bí mật, xoay khóa, giới hạn thu hồi/retry phiên.
- **WEB-API-02**: chính sách mất phản hồi và idempotency của refresh; backend xoay refresh, replay có thể thu hồi phiên.
- **WEB-API-03 (phần lỗi thời)**: lát hồ sơ API đầu tiên. Đề xuất ban đầu chỉ name GET/PUT; báo cáo sau cho thấy tên và liên hệ đã xong nhưng chưa có ghi nhận đóng câu hỏi.
- **WEB-API-04**: đăng xuất offline (UC07), ý định thu hồi trong BFF, phản hồi logout muộn sau login mới. Có đề xuất tombstone + nợ thu hồi có giới hạn; chưa chọn nơi lưu.
- **WEB-API-05**: tham số `user_name`, `time` của MSG06 chờ backend.
- **WEB-API-06**: danh mục vai trò mặc định (OMTS-123 To Do), ngữ nghĩa OwnRecords theo thực thể, ràng buộc `platform.cooperative.provision`.
- **WEB-EMP-ERROR-01 (phần mở)**: tên nhân viên có cấu trúc cho MSG24, đường dẫn model-binding lồng, form sửa nhóm.
- **WEB-COOP-BANK-01**: giữ hay chuyển khối ngân hàng (BA).
- **Chính sách phiên nhàn rỗi/dài hạn/thiết bị dùng chung**: NFR-01 mặc định 15 phút / 7 ngày / 30 ngày; chưa bàn.

## Chặn và lưu ý
- **Kích hoạt Staff email-HOẶC-SĐT**: backend chỉ SĐT nên onboarding liên hệ Staff bị chặn.
- **Tạo tài khoản**: cần hợp đồng backend cho username sinh tự động và giao bí mật an toàn.
- **Actor SysAdmin bị gỡ khỏi backend từ 22/10** (`WEB_SYSADMIN_GAP_2026-11-06.md`). Chỉ mock có sysadmin; runtime họp cô lập có tài khoản `sysadmin` (phạm vi cấp HTX chưa rõ). API `/system/cooperatives/new` không trả quyền. Danh sách/tạo/khóa tài khoản toàn hệ thống và audit cần backend.
- **Vercel chỉ mock**: thật cần backend HTTPS ổn định + Redis có TLS/xác thực; preview nằm sau Vercel Authentication; thiếu `/api/auth/*` sống thì F5 mất phiên.
- **Không có nhánh backend tích hợp duy nhất** (`PROJECT_GAP_AND_INTEGRATION_AUDIT_2026-11-05.md`): `develop` canonical (`629e481d`, 247 endpoint), nhánh khác là tập con.
- **GitGuardian** trên PR Web vẫn fail (phát hiện fixture lịch sử). Chủ repo xử lý; không đánh dấu đã sửa.
- **Yêu cầu mua**: develop dùng kg + Owner accept/decline trực tiếp; nhánh số lồng + staffing (`cors-zalo-mini-app`, PR20) chưa merge; phải xác nhận lại khi merge.
- **Workforce, nghỉ phép**: `/api/workforce/*`, `/api/me/workforce`, `/api/me/leave-requests` vắng ở `develop` → 502 trên develop (`BACKEND_API_REQUESTS_FROM_WEB_2026-11-09.md`, A4).
- **Refresh/401**: chưa bật. **Hàng đợi offline**: không có.

## Câu hỏi trong báo cáo mới nhất (`WEB_SALES_PAYMENTS_LANDING_2026-11-09.md`)
- Ánh xạ `zoneStatus` sang tiếng Việt; vùng ngừng có tính "không đo gần đây"? ngưỡng 24 giờ là tạm.
- Trạng thái chu kỳ "Open"/"Closed" có đúng không?
- Manager và Accountant có quyền View `SALES_INVOICES`, `CUSTOMER_PAYMENTS`, `CUSTOMERS` không?
- Người đã đăng nhập vào `/` có chuyển sang `/dashboard` không (quyết định đọc phiên ở trang công khai)?

## Câu hỏi chưa giải quyết từ quét tài liệu
1. Mật khẩu mock nào đúng (README vs quyết định 03/11 và runbook)?
2. `experiment/wireframe-cycle-redesign-20261107` có thành nhánh review chính thức không, hay quay lại `feature/OMTS-132-web-foundation`?
3. Nhiều commit thiếu khóa Jira (xem `05-git-state.md`); có kế hoạch đổi tiêu đề khi squash-merge không?
4. Khi nào nhánh Web merge vào `develop` (tag v3.0.0 dự kiến 21/11/2026)?
5. SysAdmin có tồn tại ở runtime backend nào ngoài runtime họp cô lập không?
6. Phần chưa đọc: chỉ đọc 150 dòng đầu của `PROJECT_CONTEXT.md` (mục cũ có thể thêm hoặc mâu thuẫn), và tiêu đề của bốn kế hoạch lớn (`WEB_IMPLEMENTATION_PLAN`, `WEB_REAL_API_IMPLEMENTATION_PLAN`, `AUTH_ALIGNMENT_IMPLEMENTATION_PLAN`, `UI_PAGE_BLUEPRINTS`), gồm checklist Definition-of-Done ở §5–6 của `WEB_IMPLEMENTATION_PLAN`.
