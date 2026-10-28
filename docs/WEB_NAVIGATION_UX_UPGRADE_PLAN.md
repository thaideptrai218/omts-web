# Nâng cấp giao diện và điều hướng Web,28/10/2026

Yêu cầu: làm lại sidebar và nâng chất lượng UI/UX, giữ nghiệp vụ/quyền đã chốt. Bản hiện hành274dbe0 sạch trước khi bắt đầu. API/refresh vẫn tắt; MSG06/tên MSG24/GitGuardian giữ chờ. Không làm mobile hoặc mở thêm luồng nghiệp vụ trong đợt thiết kế này.

## Thiết kế

Giữ Geist, màu xanh biển và các component popup. Sidebar chuyển sang nền sáng, chữ dễ đọc, mục đang chọn nổi bật xanh; mặc định mở trên desktop. Nhóm điều hướng theo Bảng điều hành, Nuôi trồng, Nhân sự/phân quyền và HTX/hệ thống; mọi route/capability hiện có giữ nguyên. Tên người dùng, vai trò và phạm vi ở sidebar, không thêm topnav tài khoản/không gian làm việc.

Chế độ thu gọn có nút mở/giữ menu rõ ràng. Hover mở sau một khoảng ngắn và đóng có độ trễ để giảm bật/tắt vô ý; focus bàn phím giữ menu mở. Cùng một trạng thái quyết định grid và nhãn, không dùng CSS hover độc lập. Sidebar chiếm cột layout, không đè nội dung. Menu di động dùng dialog, giữ khóa cuộn/focus/Escape; khi về desktop thì đóng drawer và giải phóng khóa.

## Micro-task

| Mã | Thực hiện | Bằng chứng |
| --- | --- | --- |
| UI1 | Chụp trước, đọc shell/CSS/test, ghi inventory route | Ảnh dashboard/sidebar cũ local; danh sách capability không bị mở rộng |
| UI2 | Tách dữ liệu/renderer điều hướng và điều khiển sidebar | Test default mở, toggle, hover delay/re-entry, focus, cleanup |
| UI3 | Dựng sidebar sáng, active/hover/focus/compact, identity/logout, mobile | Browser1440/1024/360, không che chữ/tràn ngang; permission lọc đúng |
| UI4 | Chỉnh header/bộ đếm dùng chung và dashboard | Giữ số liệu/shortcut/empty/error; hình thức thống nhất, không thêm số liệu giả |
| UI5 | Self-review và bàn giao | Hồi quy shell/dialog/dashboard, lint/typecheck/build/full test/HTTP; ảnh sau và báo cáo/bài học local |

Sửa `app-shell.tsx`, tách component/CSS trong `src/components/layout/`; chỉnh component header/bộ đếm và dashboard liên quan. Không xóa route, không thêm trang showcase hoặc đổi contract service. Hallmark dùng để audit theo app screen; không tự đổi theme, dời bảo mật hoặc áp bố cục marketing.

## Trạng thái

UI1–UI5 đã triển khai và review trong phạm vi trên. Có sửa thêm CSS loader làm mất class export khi build và đóng drawer khi resize; [báo cáo](reports/WEB_SIDEBAR_DASHBOARD_UX_REVIEW_2026-10-28.md) ghi bằng chứng/lỗi/giới hạn. Full2.455 pass/31 Redis skip, build20/20, lint/typecheck và30 built-product assertions đạt. Không coi các số này là nghiệm thu API hoặc hoàn tất mọi chức năng SRS.
