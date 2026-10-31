# Làm rõ thay đổi giao diện quản trị — 27/10/2026

Tiếp tục28/10 theo [plan buổi review](WEB_EVENING_REVIEW_PLAN_2026-10-28.md): ghép xác minh liên hệ hiện có, review/phát hành P7 cùng các bản sửa vòng đời form, OTP và HTX; giữ ngân hàng chờ BA. [Báo cáo mới](reports/WEB_EVENING_REVIEW_COMPLETION_2026-10-28.md) có kết quả source hiện tại; các số P7 phía dưới là snapshot27/10.

Yêu cầu: dashboard, nhân viên, tài khoản và vai trò phải có thay đổi nhìn thấy được, dễ thao tác và giữ các luồng đã chốt. Không bật API/refresh hoặc ghép mutation mock vào phiên thật. Không commit/push/merge trong lượt này khi chưa được yêu cầu.

## Thứ tự micro-task và tiêu chí kiểm

| Lát | Thay đổi | Kiểm chứng |
| --- | --- | --- |
| P0.1 | Đọc Jira OMTS-201/203, parent118 và SRS UC12; đối chiếu backend roles local | Ghi mâu thuẫn và nguồn; không sửa Jira/SRS/backend |
| P0.2 | Ghi quyết định mới: vai trò cố định; hỏi danh sách và khả năng sửa quyền/trạng thái | Chờ trả lời phần phụ thuộc, không tự chọn Staff/role catalog |
| P1.1 | Icon SVG dùng chung, page heading và summary strip màu biển | Dùng lại cho 4 màn, keyboard/focus và reduced-motion giữ nguyên |
| P2.1 | Dashboard hiển thị heading và lối tắt theo quyền trước khi load số liệu | Test promise chưa resolve vẫn có heading/lối tắt; chưa có số giả 0 |
| P2.2 | Thẻ số liệu, biểu đồ nhân sự và trạng thái tài khoản bằng dữ liệu sẵn có | Test dữ liệu, quyền; không bịa thu chi/sản lượng hoặc lịch sử |
| P2.3 | Refresh/retry tại chỗ; không để phản hồi account cũ đè account mới | Test lỗi/retry/late result; không thêm session cache |
| P2.4 | Nghiên cứu skeleton/streaming, tổng hợp trước, procedure/job; đề xuất cho backend | Tài liệu có nguồn, ưu/nhược và câu hỏi freshness/permission; không cài cron hoặc sửa DB |
| P3.1 | Nhân viên: danh sách dạng hàng rõ cột, avatar, tình trạng liên kết | Mở popup editor như cũ; điện thoại và thông tin không tràn |
| P3.2 | Tìm kiếm + lọc trạng thái/link + xóa lọc và empty state | Test kết hợp lọc, reset; lưu/unlink/version tests cũ vẫn qua |
| P4.1 | Tài khoản: tên/username/contact, trạng thái, vai trò/vùng dễ quét | Owner vẫn readonly, không mất grant, không thêm quyền |
| P4.2 | Thêm status filter, giữ zone/role/search; chỉnh nhãn select tách options | Test kết hợp/bỏ lọc và mở popup |
| P5.1 | Vai trò theo quyết định P0.2; hàng hiển thị mô tả, số account và trạng thái | Không tự xóa dữ liệu role/history; contract backend còn mở |
| P5.2 | Editor quyền dễ tìm và phân nhóm; hành động phù hợp fixed policy | Không đổi quy tắc View/scope/impact; không âm thầm cấp quyền |
| P6.1 | Regression, lint/typecheck/build, HTTP smoke; tự review | Báo pass/fail/skip theo đúng source cuối |
| P6.2 | Browser: ảnh trước/sau, dialog, filter, loading và quyền | Chỉ nhận viewport đã kiểm thực tế; ghi rõ giới hạn |
| P6.3 | Báo cáo, cập nhật context/guide, bài học tiếng Việt local | README/guide tiếng Anh; learning vẫn ignored |

## Kết quả theo lượt

P0 đã được chốt: ba vai trò cố định Quản lý vùng/Kế toán/Nhân viên; Owner sửa quyền và ngừng/khôi phục; Staff chưa có quyền nghiệp vụ mặc định. [Quyết định riêng](decisions/WEB_FIXED_ROLES_DECISION_2026-10-27.md) ghi mâu thuẫn với SRS/Jira/backend và đề xuất cho nhóm, không sửa nguồn gốc.

P1–P6 hoàn tất trong phạm vi polish: thêm 25 cases trong 7 test files; full đạt 1.624 PASS/31 Redis SKIP. Hai lỗi P2 ở confirmation khôi phục và Escape trong pending account save đã có test tái hiện và sửa. Browser đã kiểm role readonly name/filter/save/stop/restore, employee filters/popup và account filters/popup. Dashboard header/lối tắt được thu gọn thêm sau review ảnh để số liệu xuất hiện sớm hơn ở khung hẹp. Bốn màn và popup đã kiểm ở 360/1024 px; build 18/18 và HTTP smoke 24 assertions PASS trên bản cuối. Kết quả, giới hạn và P3 thanh cuộn popup ghi trong [báo cáo polish](reports/WEB_MANAGEMENT_POLISH_REVIEW_2026-10-27.md). Redis, HTTPS, API/QA và đo hiệu năng backend vẫn chưa được kiểm chứng bởi lượt này.

## Thiết kế

Follow-up P3: [khóa cuộn popup](reports/WEB_DIALOG_SCROLL_LOCK_REVIEW_2026-10-27.md) đã hoàn tất với 8 test bổ sung; full 1.632 PASS/31 Redis SKIP, lint/typecheck/build/HTTP PASS và kiểm cuộn thực tế 360/1024. Popup/menu dùng chung khóa; đóng xác nhận con không mở cuộn nền, đóng lớp cuối khôi phục cuộn. Đây là cập nhật thay cho trạng thái P3 còn mở ở lượt polish ban đầu.

Giữ xanh biển của OMTS, chuyển các danh sách card giống nhau thành danh bạ có cột rõ ở desktop và hàng tự xuống dòng trên điện thoại. Nút chính đặt cạnh tiêu đề; thanh lọc tách biệt; thông tin phụ có nhịp đọc rõ. Dashboard có số liệu thực từ mock hiện tại và hai biểu đồ trạng thái; phần vận hành chưa có số liệu không được dựng biểu đồ giả. Popup và xác nhận nghiệp vụ tiếp tục dùng component có sẵn.

## Giới hạn tốc độ

Mục tiêu frontend là không chặn toàn bộ màn để chờ số liệu: khung và lối tắt hiện trước, các ô chờ riêng. Con số mới chính xác vẫn phải có nguồn dữ liệu. Tổng hợp trước ở backend là đề xuất riêng, cần chốt mức trễ dữ liệu chấp nhận được, phạm vi account/zone và cơ chế cập nhật; không tự bật cache hoặc cron job.

## P7 — Hồ sơ và tùy chọn thông báo (tiếp tục 27/10)

Người dùng yêu cầu chuyển sang việc khác, để incident GitGuardian xử lý sau. Lát này hoàn thiện các màn hiện có, không đổi nghiệp vụ hoặc bật API. Jira OMTS-201 ACS-05/07 và parent OMTS-118 đã đọc lại; các khác biệt nghiệp vụ trước đó giữ theo quyết định đã chốt.

| Micro-task | Phần việc | Tiêu chí |
| --- | --- | --- |
| P7.1 | Test vòng đời tải hồ sơ và retry | Account A không hiện khi đang tải B; response retry cũ không đè B; profile sai accountId không được render |
| P7.2 | Tách state hồ sơ theo account và gom đường load/retry | Keyed workspace; mỗi effect có cleanup; retry cùng account vẫn hoạt động |
| P7.3 | Test đóng/mở thông báo và response save muộn | Đóng từ parent bỏ draft; save cũ không đóng popup mới hoặc báo toast/expiry sau unmount; pending vẫn chặn dismiss |
| P7.4 | Sửa ownership request của popup; chỉnh trạng thái loading/error nếu cần | Giữ matrix/quyền/kênh/MSG/validation; không tự hủy mutation backend hoặc tuyên bố rollback |
| P7.4b | Race pending phát hiện trong full suite | Test Escape tại lúc bàn giao save phải RED/GREEN; khóa close đồng bộ ở tài khoản và thông báo, không chỉ chờ effect |
| P7.5 | Regression, lint/typecheck/build và kiểm browser 360/1024 | Báo đúng pass/skip; kiểm các luồng thật có thể đi, không dựng showcase |
| P7.6 | Báo cáo và bài học local | Ghi lỗi RED/GREEN, giới hạn và việc còn chờ; chưa tự commit/push/merge trong lượt này |

P7.1–P7.6 đã hoàn tất trong phạm vi này: 14 case mới, full cuối 1.649 PASS/31 Redis SKIP; lint/typecheck/build/24 HTTP assertions PASS. Đã kiểm 360/1024, save/draft/focus và Owner→Staff bằng browser; fix thêm cleanup native dialog sau khi browser phát hiện mất focus. [Báo cáo chi tiết](reports/WEB_PROFILE_NOTIFICATION_LIFECYCLE_REVIEW_2026-10-27.md) giữ cả hai lượt full lỗi ban đầu, RED/GREEN và giới hạn. API/QA/HTTPS/GitGuardian vẫn là các phần riêng; chưa commit/push/merge.
