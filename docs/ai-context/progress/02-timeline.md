# 02 — Dòng thời gian

Bằng chứng nằm ở `docs/reports/` trừ khi ghi khác. Lịch sử git bắt đầu 13/10/2026.

| Ngày | Mốc | Bằng chứng |
| --- | --- | --- |
| 13/10 | Khởi tạo Next.js, README, hướng dẫn đóng góp, workflow CI/quét bí mật/release | git |
| 14/10 | WEB-AUTH-01 chốt | `decisions/OPEN_QUESTIONS.md` |
| 15/10 | Rà soát UI-ready | `WEB_UI_READY_REVIEW_2026-10-15.md` |
| 16/10 | Mock Phase B/C: đăng ký, đăng nhập/cổng, khôi phục, mật khẩu, hồ sơ, thông báo, đăng xuất | 20+ báo cáo `OMTS-154/159/163/167/171/175/179_*`; `PHASE_B_UI_READY_REVIEW_2026-10-16.md` |
| 17/10 | Mock Phase D: khởi tạo, hồ sơ HTX, vai trò, tài khoản, nhân viên | `OMTS-183/186/190/193/196_*`; `PHASE_D_FULL_REVIEW_2026-10-17.md` |
| 20/10 | Tiến độ căn chỉnh auth, rà backend | `AUTH_ALIGNMENT_IMPLEMENTATION_PROGRESS_2026-10-20.md`, `AUTH_DECISION_BACKEND_ALIGNMENT_REVIEW_2026-10-20.md` |
| 21/10 | Kiểm kê lỗi UX | `WEB_PRODUCT_UX_DEFECT_AUDIT_2026-10-21.md` |
| 23/10 | Đánh giá sẵn sàng API thật | `WEB_REAL_API_READINESS_AUDIT_2026-10-23.md` |
| 24/10 | W0/W1 (vá phụ thuộc, schema, ánh xạ lỗi/quyền); W2 phiên/BFF/Redis/cookie/CSRF/hạn; cổng test CI | `WEB_W0_W1_FULL_REVIEW_2026-10-24.md`, `WEB_W2_*`, `WEB_CI_TEST_GATE_REVIEW_2026-10-24.md` |
| 25–26/10 | Guard phiên server, runtime/DAL, route, dịch vụ phiên đăng nhập, chuẩn bị hydrate; kiểm gỡ liên kết nhân viên | `WEB_W2_4*`, `WEB_W3_*`, `BACKEND_JIRA_EMPLOYEE_UNLINK_AUDIT_2026-10-26.md`, `WEB_TEACHER_HANDOFF_2026-10-26.md` |
| 27/10 | Vai trò cố định; quyết định điều phối đăng nhập; sẵn sàng review; polish quản lý; khóa cuộn; rà backend | `WEB_REVIEW_READINESS_2026-10-27.md`, `WEB_MANAGEMENT_POLISH_REVIEW_2026-10-27.md`, `WEB_LOGIN_COORDINATION_DECISION_2026-10-27.md`, `BACKEND_DEVELOP_UPDATE_AUDIT_2026-10-27.md` |
| 28/10 | Vùng, bè, bộ nhân viên, review tối, UX sidebar, rà CI theo SHA | `WEB_EMPLOYEE_*`, `WEB_FARMING_ZONES_UX_REVIEW`, `WEB_RAFT_MANAGEMENT_REVIEW`, `WEB_EVENING_REVIEW_COMPLETION`, `WEB_SIDEBAR_DASHBOARD_UX_REVIEW`, `WEB_CI_*_2026-10-28` |
| 29/10 | Workspace API sống; HTX, nhân viên, INP/ENV, tệp trang trại, cá nhân/thông báo/quyền, G2 OTP, chứng nhận NCC | `WEB_LIVE_API_WORKSPACE`, `WEB_COOPERATIVE_API`, `WEB_EMPLOYEE_API_WORKFLOWS`, `WEB_INP_ENV_API`, `WEB_FARM_FILES_CONDITION_API`, `WEB_PERSONAL_NOTIFICATIONS_ACCESS_API`, `WEB_G2_VERIFICATION_API`, `WEB_CI_SUPPLIER_CERTIFICATES` |
| 30/10 | Hóa đơn chờ của phiếu nhập; vị trí vùng; duyệt Trader; hộp thư; rà luồng vai; QA trình duyệt (vai, admin, liên hệ/inbox, lỗi/OTP, đối soát phiếu, vai biên); bộ lọc catalog | `WEB_RECEIPT_PENDING_INVOICES`, `WEB_ZONE_POSITIONS_API`, `WEB_TRADER_APPROVAL_API`, `WEB_BACKEND_BRANCH_INBOX`, `WEB_ROLE_FLOW_AUDIT`, `WEB_BROWSER_*_2026-10-30`, `WEB_CI_CATALOG_FILTERS` |
| 31/10 | QA đọc/ghi bán hàng–nhân sự; ma trận SRS V8 ba repo; QA tích hợp hợp đồng backend | `WEB_SALES_WORKFORCE_READ_QA`, `WEB_SALES_WORKFORCE_WRITE_QA`, `THREE_REPO_UPDATE_INTEGRATION_READINESS`, `BACKEND_CONTRACT_INTEGRATION_QA` |
| 02/11 | Căn chỉnh D1–D3 (#21–#23); cổng vào/inbox/Vercel; demo workforce local; khoảng trống vai; khoảng trống thu hoạch→giao dịch | `WEB_BACKEND_21_23_ALIGNMENT`, `WEB_ENTRY_INBOX_VERCEL`, `WEB_LOCAL_WORKFORCE_DEMO`, `ROLE_FUNCTION_GAPS`, `HARVEST_TO_TRANSACTION_API_GAP`, `WEB_WORKFORCE_NAVIGATION` |
| 03/11 | Runtime Docker/API/Vercel; luồng kế toán mock; kiểm kê redesign | `WEB_DOCKER_API_VERCEL`, `WEB_LOCAL_ACCOUNTING_FLOW`, `WEB_REDESIGN_INVENTORY_AND_BATCHES` |
| 04/11 | Nối API staffing; redesign shell/login; chu kỳ đọc/ghi; lưới bè; mua hàng/nước; thuật ngữ Việt; module nhánh | `WEB_BACKEND_UPDATE_STAFFING`, `WEB_SHELL_LOGIN_REDESIGN`, `WEB_CYCLES_*`, `WEB_RAFT_DIRECTORY_GRID`, `WEB_PROCUREMENT_UI_REFINEMENT`, `WEB_WATER_SCREEN_REFINEMENT`, `WEB_VIETNAMESE_TERMINOLOGY`, `WEB_BRANCH_MODULES_BATCH`; `testing/PURCHASE_STAFFING_QA_2026-11-04.md` |
| 05/11 | Rà khoảng trống; backlog ưu tiên; chu kỳ/thả giống/vật tư/thu hoạch; hiệu chỉnh; loại công việc/nhật ký (VietMap); khách hàng; bán hàng; tài khoản nhận tiền | `PROJECT_GAP_AND_INTEGRATION_AUDIT`, `WEB_IMPLEMENTATION_PRIORITY`, `WEB_CULTIVATION_*`, `WEB_HARVEST_CORRECTIONS_PROGRESS`, `WEB_JOB_TYPES_LOGS`, `BACKEND_PULL_CUSTOMERS`, `WEB_SALES_BATCH`, `WEB_RECEIVING_BANK_ACCOUNT` |
| 06/11 | Demo API họp (8082, DB riêng); purchasing v2; hàng đợi thanh toán Kế toán; admin API; điều hướng sidebar; sửa bản đồ/chuông; batch wireframe nuôi trồng; khoảng trống SysAdmin | `MEETING_API_DEMO`, `WEB_ACCOUNTANT_PAYMENT_QUEUE`, `WEB_ADMIN_API`, `WEB_SIDEBAR_NAVIGATION`, `WEB_MAP_BELL_FIX`, `WEB_FARMING_WIREFRAME_BATCH`, `WEB_SYSADMIN_GAP`, `WEB_MEETING_FLOWS_FIX`, `WEB_MAP_CI_SECURITY` |
| 07/11 | Thử nghiệm menu ngang + tab nuôi trồng; tinh chỉnh thu hoạch/nước/mua hàng/thả giống/nhân sự; phân trang bản đồ | `WEB_TOPNAV_CULTIVATION_EXPERIMENT`, `WEB_HARVEST_REFINEMENT`, `WEB_WATER_REFINEMENT`, `WEB_PURCHASING_REFINEMENT`, `WEB_SEEDING_MATERIAL_REFINEMENT`, `WEB_WORKFORCE_REFINEMENT`, `WEB_MEETING_MAP_PAGING_WATER` |
| 08/11 | HTX v2; tinh chỉnh catalog/khách/nhân viên/bán hàng/my-work; luồng công nợ + thu hoạch; tinh chỉnh quyền; lọc checkbox; kiểm kê wireframe; cập nhật backend | `WEB_COOPERATIVE_V2_ALIGNMENT`, `WEB_*_REFINEMENT_2026-11-08`, `WEB_DEBT_AND_HARVEST_FLOW`, `WEB_ACCESS_REFINEMENT`, `WEB_CHECKBOX_FILTERS_AND_LOGIN`, `WEB_WIREFRAME_INVENTORY_2026-11-08.csv`, `WEB_WIREFRAME_PURCHASING_ALIGNMENT`, `BACKEND_UPDATE_AND_UI_FIXES` |
| 09/11 | Landing, boot screen, hóa đơn bán, thanh toán khách, sản lượng, truy xuất lô, cài đặt lương, tổng quan nước, trang nguồn gốc công khai, VietQR, yêu cầu mua theo kg, backlog backend | `WEB_SALES_PAYMENTS_LANDING`, `BACKEND_API_SCREEN_BACKLOG`, `BACKEND_API_REQUESTS_FROM_WEB`; `decisions/WEB_PURCHASE_REQUESTS_KG_CONTRACT_2026-11-09.md` |

Có tồn tại nhưng chưa tóm tắt: `WEB_BLUE_THEME_HALLMARK_REVIEW_2026-10-25`, `WEB_HALLMARK_BACKEND_AUDIT_2026-10-25`, `WEB_G1_1_LEDGER_CONTRACT_2026-10-27`, `WEB_DIALOG_SCROLL_LOCK_REVIEW`, `BACKEND_OTHER_BRANCHES_AUDIT_2026-10-28`, 26 ảnh chụp PNG (03–04/11) và 4 CSV kiểm kê.

Trạng thái kiểm chứng gần nhất (`WEB_SALES_PAYMENTS_LANDING_2026-11-09.md`): `tsc`, lint, build sạch; vitest 3.214 passed; một test nhân viên-gỡ-liên-kết fail một lần dưới tải song song và pass 40/40 khi chạy riêng; chưa có gì của đợt này được kiểm trên trình duyệt thật với backend sống.
