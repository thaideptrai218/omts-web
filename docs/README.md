# Tài liệu OMTS Web

Mục lục các tài liệu trong `docs/`. Bắt đầu với [README của repo](../README.md) để chạy ứng dụng; đọc [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) trước khi nhận việc mới.

## Tài liệu chính

| File | Nội dung |
| --- | --- |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Bối cảnh dự án, use case SRS, quyết định đã duyệt |
| [SRS_DEVIATIONS.md](SRS_DEVIATIONS.md) | Mọi điểm khác SRS v8 hoặc không có trong SRS, kèm đề xuất sửa SRS và câu hỏi mở |
| [DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md) | Quy ước giao diện, bố cục, pop-up |
| [UI_PAGE_BLUEPRINTS.md](UI_PAGE_BLUEPRINTS.md) | Mô tả chi tiết từng màn |
| [REVIEW_GUIDE.md](REVIEW_GUIDE.md) | Hướng dẫn review và chạy API cục bộ cho tester |
| `USER_FLOWS.md` | Luồng nghiệp vụ theo vai trò: **sẽ bổ sung** |

## Kế hoạch triển khai

| File | Nội dung |
| --- | --- |
| [WEB_IMPLEMENTATION_PLAN.md](WEB_IMPLEMENTATION_PLAN.md) | Kế hoạch triển khai Web tổng thể |
| [WEB_REAL_API_IMPLEMENTATION_PLAN.md](WEB_REAL_API_IMPLEMENTATION_PLAN.md) | Kế hoạch nối API thật qua BFF |
| [AUTH_ALIGNMENT_IMPLEMENTATION_PLAN.md](AUTH_ALIGNMENT_IMPLEMENTATION_PLAN.md) | Đồng bộ đăng nhập, phiên và tài khoản |
| [WEB_SRS_ROLE_IMPLEMENTATION_PLAN.md](WEB_SRS_ROLE_IMPLEMENTATION_PLAN.md) | Vai trò và quyền theo SRS |
| [WEB_RAFT_IMPLEMENTATION_PLAN.md](WEB_RAFT_IMPLEMENTATION_PLAN.md) | Quản lý bè và sơ đồ làn |
| [WEB_MANAGEMENT_POLISH_PLAN.md](WEB_MANAGEMENT_POLISH_PLAN.md) | Hoàn thiện các màn quản lý |
| [WEB_NAVIGATION_UX_UPGRADE_PLAN.md](WEB_NAVIGATION_UX_UPGRADE_PLAN.md) | Nâng cấp điều hướng và thanh bên |
| [WEB_REVIEW_READINESS_PLAN.md](WEB_REVIEW_READINESS_PLAN.md) | Chuẩn bị review |
| [WEB_EVENING_REVIEW_PLAN_2026-10-28.md](WEB_EVENING_REVIEW_PLAN_2026-10-28.md) | Kế hoạch review buổi tối 28/10/2026 |

## Quyết định (`decisions/`)

- [OPEN_QUESTIONS.md](decisions/OPEN_QUESTIONS.md): câu hỏi nghiệp vụ còn mở.
- 15 đề xuất và quyết định `WEB_*` (đăng nhập, vai trò cố định, tài khoản nhân viên, thu mua, bán hàng, kế toán...), ví dụ [WEB_FIXED_ROLES_DECISION_2026-10-27.md](decisions/WEB_FIXED_ROLES_DECISION_2026-10-27.md) và [WEB_PURCHASE_REQUESTS_KG_CONTRACT_2026-11-09.md](decisions/WEB_PURCHASE_REQUESTS_KG_CONTRACT_2026-11-09.md).

## Báo cáo (`reports/`, 261 file)

Báo cáo ghi bằng chứng tại thời điểm viết; kiểm tra code và quyết định hiện hành trước khi dựa vào. Các nhóm chính:

| Nhóm | File tiêu biểu |
| --- | --- |
| Nhân sự và lương (11/11/2026) | [SRS_CHANGE_LOG_HR_2026-11-11.md](reports/SRS_CHANGE_LOG_HR_2026-11-11.md) (nhật ký chi tiết, giữ nguyên), [PAYROLL_API_CONTRACT_2026-11-11.md](reports/PAYROLL_API_CONTRACT_2026-11-11.md), [BACKEND_EMPLOYEE_API_CHANGES_FOR_SRS_2026-11-10.md](reports/BACKEND_EMPLOYEE_API_CHANGES_FOR_SRS_2026-11-10.md) |
| Nuôi trồng (11/11/2026) | [FARMING_BACKEND_RULES_REVIEW_2026-11-11.md](reports/FARMING_BACKEND_RULES_REVIEW_2026-11-11.md), [FARMING_WEB_FLOW_REVIEW_2026-11-11.md](reports/FARMING_WEB_FLOW_REVIEW_2026-11-11.md) |
| Web, tháng 10/2026 (`WEB_*_2026-10-*`) | Phiên và đăng nhập (W2, W3), tài khoản nhân viên, API thật, xác minh G2, quyền và thông báo |
| Web, tháng 11/2026 (`WEB_*_2026-11-*`) | Kho và lô, thu mua, bán hàng, nhân sự, bản đồ và đo nước |

Toàn bộ danh sách: thư mục [reports/](reports/).

## Kiểm thử (`testing/`)

- [TESTER_RUNBOOK_2026-11-02.md](testing/TESTER_RUNBOOK_2026-11-02.md): quy trình cho người kiểm thử.
- [PURCHASE_STAFFING_QA_2026-11-04.md](testing/PURCHASE_STAFFING_QA_2026-11-04.md): kiểm thử thu mua và nhân lực.

## Ngữ cảnh cho AI (`ai-context/`)

[README.md](ai-context/README.md) và các thư mục `architecture/`, `design/`, `prd/`, `progress/`, `rules/`, `tasks/`.

## Quy ước

- README chỉ giới thiệu, cài đặt và cách dùng. Thay đổi so với SRS ghi trong [SRS_DEVIATIONS.md](SRS_DEVIATIONS.md), không ghi trong README.
- Thư mục `docs/learning/` và `.hallmark/` là ghi chú cục bộ, không đưa vào Git.
- Phía backend: `omts-backend/docs/SRS_DEVIATIONS.md` (repo backend) tóm tắt các mục backend.
