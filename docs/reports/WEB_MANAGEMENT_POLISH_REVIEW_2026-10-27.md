# Polish dashboard, nhân viên, tài khoản và vai trò

Ngày 27/10/2026; nhánh `feature/OMTS-132-web-foundation`. Giữ các thay đổi local trước đó, không reset/merge develop. Đây là bản mock; API/refresh vẫn tắt. [Plan theo từng lát](../WEB_MANAGEMENT_POLISH_PLAN.md).

## Quyết định mới đã nhận

Duy Thái xác nhận chỉ ba vai trò vùng: Quản lý vùng, Kế toán, Nhân viên; tên cố định. Owner sửa quyền và ngừng dùng/khôi phục, không tạo hoặc sao chép. Nhân viên ban đầu không có quyền nghiệp vụ. Quyết định và đề xuất BA/backend: [WEB-ROLE-01](../decisions/WEB_FIXED_ROLES_DECISION_2026-10-27.md).

SRS UC12/Jira OMTS-201 ACS-10 và backend local48ae1e0 vẫn cho Create/Copy; không thấy quy tắc cũ giới hạn role theo số fixture. Vì người dùng chốt thay đổi nghiệp vụ, lượt này chuyển product mock sang fixed roles, không gọi đây là sửa lỗi backend hoặc chứng minh API đã đổi. Không sửa SRS/Jira/backend. Jira được đọc lại: OMTS-201 In Progress, OMTS-203 To Do, parent118 In Progress; không cập nhật trạng thái theo số test.

## Thay đổi nhìn thấy trên từng màn

| Màn/lát | Trước | Sau |
| --- | --- | --- |
| P1 — Khung chung | Heading, card và icon mỗi nơi một kiểu | Heading xanh biển, summary strip, SVG icon và badge dùng chung; token theme hiện tại, không thêm thư viện UI/runtime |
| P2 — Dashboard | Loading thay cả nội dung, icon ký tự, nhiều ô vận hành không có số | Heading/lối tắt theo quyền hiện trước số liệu; skeleton riêng vùng data, refresh/retry tại chỗ. Thẻ số liệu, donut nhân sự, biểu đồ trạng thái tài khoản dùng snapshot hiện tại. Vận hành chưa có nguồn được gom thành một trạng thái rõ ràng |
| P3 — Nhân viên | Card lặp nhau, tìm tên/điện thoại | Danh sách hàng với avatar, liên hệ, trạng thái, username/link; summary tổng/đang làm/đã liên kết; thêm lọc làm việc và liên kết, kết hợp search/reset/empty state |
| P4 — Tài khoản | Card nhiều nhãn, lọc thiếu trạng thái | Hàng rõ tên/username/contact, đầy đủ grant vùng–role, trạng thái; summary nội bộ; thêm lọc active/locked, giữ zone/role/search; label select tách khỏi options. Owner readonly, popup và xác nhận giữ nguyên |
| P5 — Vai trò | Add/Copy/đổi tên, không có UI reactivate đầy đủ | Ba role cố định, bỏ Add/Copy, tên readonly; product adapter chặn create/copy-shaped save/rename. Staff không có quyền nghiệp vụ mặc định. Ngừng dùng vẫn chặn role có grant; khôi phục có xác nhận, giữ matrix và cấp version mới, không hồi sinh revoked grants |
| Form quyền | Hai bản DOM cho desktop/mobile, khó tìm function | Một bản responsive; tìm function/lọc nhóm, mở từng mục; chỉ action hỗ trợ được dựng, View khóa đúng rule, filter giữ các permission ngoài màn. Dòng lỗi luôn hiện/mở dù đang lọc nhóm khác |

Lối tắt chỉ dẫn tới màn đang có và quyền được cấp; không bịa thao tác thu chi/thu hoạch hoặc menu nghiệp vụ Staff chưa triển khai. Cấu hình quyền trong mock không phải bằng chứng quyền backend đã thực thi. Generic repository/fixture cũ vẫn phục vụ contract tests lịch sử; product composition dùng fixed policy riêng.

## Tự review và lỗi thực tế

- **POLISH-REV-01, P2, đã sửa:** confirmation khôi phục chỉ đóng ở nhánh thành công. Khi conflict, alert ở editor bị modal che. Regression thất bại trước sửa (vẫn tìm thấy confirmation khi mong nó đã đóng). Đóng confirmation trong finally, giữ editor/alert để xử lý; 3 UI role cases PASS sau sửa.
- **POLISH-REV-02, P2, đã sửa:** Escape đóng account editor trong lúc đã xác nhận save nhưng promise chưa trả. Regression tái hiện dialog mất khỏi UI. AccountEditor báo pending lên cha; Dialog cha không dismissible khi save/status mutation pending, mở lại sau kết quả. Test actual preview→save→cancel pending→resolve→cancel PASS.
- Typecheck bắt TS2769 do test dùng `exact` của Playwright trong React Testing Library. Vitest vẫn chạy được, nên không coi test PASS thay cho TSC. Bỏ option thừa, giữ exact string name mặc định; typecheck cuối PASS.
- Self review CSS sửa divider từ last-child trên button (mỗi button đều là con cuối của li) sang divide-y trên ul, để các hàng được phân cách đúng.
- apply_patch từ chối hai thao tác cùng path và một patch docs sai context. Đã kiểm source thực tế trước khi áp lại tuần tự/đúng context; không coi lệnh lỗi là code đã sửa. Bài97 local ghi lại chi tiết.

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Dashboard UI | 5 cases PASS: shell trước response, counts/chart/refresh, error/retry, deny, late response sau đổi account |
| Danh sách | 6 cases PASS: employee và account combined filters/reset/empty/open-ID; giữ All zones và loại revoked grant |
| Fixed-role adapter | 7 cases PASS: ba role, Staff deny-by-default, create/copy/rename, matrix validation/edit, usage guard và version/restore |
| Role UI/matrix | 6 cases PASS: filter không mất quyền, invalid row không bị ẩn, action hỗ trợ, readonly name, save, discontinue/reactivate, lỗi confirmation |
| Account pending | 1 regression PASS trước/sau pending như mô tả |
| Legacy flow regression | Role repositories + shared composition + auth flows + employee unlink: 43 cases PASS trong targeted run |
| Full `npm test` sau sửa pending | 147 files PASS, 4 SKIP; 1.624 tests PASS, 31 Redis SKIP (99,94 giây) |
| Lint | PASS ở lượt cuối sau thay đổi source |
| Typecheck | PASS sau sửa options test |
| Build bản cuối | PASS: 18/18 trang; static generation 981 ms |
| HTTP `npm run test:session-pages` trên bản build cuối | PASS: 24 assertions |
| Targeted sau chỉnh header/typecheck | PASS: 9 cases dashboard, account pending và role UI |

Full suite chạy trước các tinh chỉnh thuần bố cục cuối (header dashboard gọn hơn, summary ba ô trên điện thoại, ba card role từ 1024 px). Lint, typecheck, build và HTTP smoke đã chạy trên source cuối. Không suy unit tests là browser/QA/Redis integration. 31 Redis tests chưa chạy vì không cấp endpoint trong lượt này.

## Kiểm tra giao diện thực tế

Đã dùng trình duyệt với viewport 360×800 và 1024×768 cho cả bốn màn. Ở 360 px, document clientWidth và scrollWidth cùng bằng 345 px; ở 1024 px cùng bằng 1009 px (phần còn lại là thanh cuộn dọc). Không thấy tràn ngang trong các trạng thái đã kiểm. Đây là kiểm bốn màn của lượt polish, không phải chứng nhận mọi màn và mọi thiết bị.

Đã kiểm lọc nhân viên đang làm/chưa liên kết, lọc tài khoản theo vùng và trạng thái khóa, mở đúng hồ sơ rồi xóa bộ lọc. Với vai trò: tên readonly, tìm chức năng, sửa mô tả, lưu, ngừng dùng vai trò chưa được gán và khôi phục; số lượng luôn là ba và Staff vẫn không có quyền nghiệp vụ. Ở 360 px, đã mở form thêm nhân viên, thêm tài khoản và sửa Staff: dialog rộng 328 px, không tràn ngang, Escape đóng được. Không tạo bản ghi hoặc đổi mật khẩu qua trình duyệt trong phần kiểm bố cục này.

Review ảnh phát hiện summary xếp dọc chiếm quá nhiều chiều cao trên điện thoại và card role chưa chia cột ở 1024 px; đã sửa và kiểm lại bản build cuối. Lượt đầu ghi nhận **P3 POLISH-REV-03**: popup ở khung hẹp có thể thấy đồng thời thanh cuộn dọc của nền và của form. **Đã sửa ở lượt tiếp theo:** [review khóa cuộn](WEB_DIALOG_SCROLL_LOCK_REVIEW_2026-10-27.md), thêm 8 regression cases, full 1.632 PASS/31 Redis SKIP và kiểm browser 360/1024. Không có lỗi P2 chưa sửa trong các đường đi vừa review.

Ảnh local trong `.hallmark/polish-2026-10-27/`: `dashboard-1024.png`, `employees-1024.png`, `accounts-1024.png`, `roles-1024.png` và các bản `*-360.png`, form nhân viên/tài khoản 360 px. Thư mục ảnh vẫn ignored. Đã trả viewport về kích thước ban đầu và giữ tab `/dashboard` để review. Server production local chạy tại `http://127.0.0.1:3000`.

## Nghiên cứu tốc độ

[Đề xuất riêng](../decisions/DASHBOARD_LOADING_AND_AGGREGATION_PROPOSAL.md) phân biệt khung hiện trước với số liệu tính sẵn. Đã đọc docs Next16.4.3 cài local và nguồn chính thức Next/Microsoft. Backend local dùng SQL Server, nên không áp PostgreSQL REFRESH MATERIALIZED VIEW. Khuyến nghị đo query/index/projection trước; bảng tổng hợp theo scope và job/event là lựa chọn tiếp theo khi có nhu cầu thật.

Chưa chốt độ trễ số liệu, hạ tầng job hoặc cache policy; không cài cron/procedure, đổi DB hay đưa snapshot Owner cho mọi account. Frontend vẫn phải chờ nguồn hợp lệ cho số mới; không hiển thị số 0 giả. Khả năng streaming của framework chưa phải server streaming đã triển khai trong luồng mock này.

## Handoff và giới hạn

README/Reviewer guide tiếng Anh đã thay walkthrough tạo role tùy ý bằng cấu hình ba role cố định. Bài96–98 tiếng Việt nằm ở docs/learning, vẫn ignored. [Bản review trước](WEB_REVIEW_READINESS_2026-10-27.md) là snapshot trước quyết định fixed roles; hướng dẫn Add/Copy cũ trong báo cáo lịch sử không còn áp dụng.

Mock RAM vẫn reset khi reload. API/refresh, thu chi/nuôi/harvest/QR, migration role backend, HTTPS và QA chưa được nghiệm thu bởi đợt polish. Lượt polish ban đầu chưa commit; người dùng đã yêu cầu commit/push cùng lượt sửa P3 tiếp theo, vẫn chưa merge develop.
