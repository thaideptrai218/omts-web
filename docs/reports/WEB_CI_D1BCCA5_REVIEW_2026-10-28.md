# Đối chiếu CI cũ a390b09 và bản mới d1bcca5

Ngày 28/10/2026, Asia/Saigon. Người dùng gửi run `40605185113` và hỏi kiểm tra lỗi. Đã đọc metadata và log đầy đủ của run cũ lẫn run mới, đối chiếu commit và source hiện tại; không thay code hoặc chạy lại các test local trùng lặp khi CI đúng SHA đã có bằng chứng.

## Run người dùng gửi là bản cũ

[Run 40605185113, job 122542802449](https://github.com/thaideptrai218/omts-web/actions/runs/40605185113/job/122542802449) thuộc `a390b09992e38d4efd2562e6fa0af287944c2074`, bắt đầu 06:53:35 ngày 28/10 theo giờ Việt Nam. Lint/typecheck đạt; npm test thất bại. Build và HTTP bị skip vì bước test lỗi.

Log thực ghi `Test Files 1 failed | 168 passed | 4 skipped (173)` và `Tests 1 failed | 2043 passed | 31 skipped (2075)`. Chỉ một test lỗi: popup Nguyễn Văn An bị đóng bởi Escape khi save đã bắt đầu mà pending chưa được truyền lên cha. Bốn file còn lại là Redis integration suites được skip, không phải bốn lỗi thực thi bổ sung. Khối summary “4 failures / 0 total / 31 skips” không được dùng thay log này; chưa xác định nguyên nhân công cụ tổng hợp hiển thị sai. Thông báo chuyển nhãn Ubuntu là notice, không phải lỗi được log chỉ ra tại npm test.

Bản sửa [f844b58](https://github.com/thaideptrai218/omts-web/commit/f844b58eebae840c47b61c38e7bdc8d61f7aaed0) đã truyền pending đồng bộ trước lệnh và dùng ref guard khi đóng. Test phát cancel ngay bên trong save và kiểm cả saved/forbidden. `git merge-base --is-ancestor f844b58 HEAD` trả 0: bản sửa có trong d1bcca5. [Báo cáo RED/GREEN trước đó](WEB_CI_E3C3013_REVIEW_2026-10-28.md#follow-up-a390b09--race-đóng-popup-khi-đang-lưu) giữ chi tiết tái hiện, không tăng timeout hoặc bỏ assertion.

## CI đúng commit mới nhất

SHA kiểm: `d1bcca514c24b5aca912cc305093e3cdf7734a2b`, nhánh `feature/OMTS-132-web-foundation`. Run CI kết thúc **12:42:37 ngày 28/10** theo giờ Việt Nam.

| Check | Kết quả | Bằng chứng |
| --- | --- | --- |
| build-test | SUCCESS | [Run 40639403685, job 122653764986](https://github.com/thaideptrai218/omts-web/actions/runs/40639403685/job/122653764986) |
| gitleaks | SUCCESS | [Run 40639403696, job 122653765217](https://github.com/thaideptrai218/omts-web/actions/runs/40639403696/job/122653765217) |
| pr-title | SUCCESS | [Run 40639402266, job 122653761552](https://github.com/thaideptrai218/omts-web/actions/runs/40639402266/job/122653761552) |
| GitGuardian Security Checks | FAILURE | [Check 122653755220](https://github.com/thaideptrai218/omts-web/runs/122653755220) |

Log Linux xác nhận npm ci, lint, typecheck, test, build và HTTP smoke đều thành công. Có **176 file pass/4 file skip; 2.160 test pass/31 Redis skip**, Vitest 34,33 giây. Riêng `account-pending-dialog.test.tsx` **4/4**, `employee-unlink.test.tsx` **39/39**, `employee-workspace-lifecycle.test.tsx` **12/12** đạt. Build tạo **18/18** trang; `test:session-pages` đạt **24 assertions**. Không có finding code mới cần vá hoặc thêm test trùng lặp trong lượt kiểm này.

GitGuardian báo 7 vị trí thuộc 6 incident `38252611`, `38275825`, `38275826`, `38314032`, `38314033`, `39141309`. Các link commit được check trả về là `56ba7f4`, `7316e55`, `79066ed`, `c2415cc`, `ddb2b21`; không có dòng gán cho d1bcca5 trong kết quả này. Không coi đây là đảm bảo audit mọi secret. Giữ yêu cầu để incident sau; không tắt scanner, thay history hoặc tự phân loại incident.

## Phạm vi và trạng thái

[PR #3](https://github.com/thaideptrai218/omts-web/pull/3) vẫn OPEN/DRAFT, base develop, head d1bcca5. Chưa merge; API/refresh vẫn tắt, MSG06 và tên MSG24 tiếp tục chờ backend. Redis skip không phải nghiệm thu Redis thật hoặc QA.

Chỉ cập nhật bằng chứng báo cáo/context và bài học local, chưa tạo commit/push mới trong lượt “check git” này. Các sửa đổi profile/notification/Dialog từ trước được giữ nguyên. Log/check JSON local nằm trong `.hallmark/`, không đưa credential hoặc log thô vào Git. Không dùng SUCCESS của d1bcca5 gán cho SHA tài liệu phát sinh sau này.
