# Nhân viên — nghỉ việc và đi làm lại bằng mock

Ngày 28/10/2026, Asia/Saigon, nhánh `feature/OMTS-132-web-foundation`, nền `19c47bc`. Triển khai ban đầu giữ local; lượt review tiếp theo được người dùng yêu cầu cập nhật báo cáo và commit/push cùng nhánh. Đọc OMTS-203, parent OMTS-119, dependency OMTS-199, UC10 và backend local953f597: EmployeeService, EmployeeDtos, BusinessClock, EmployeeRepository. Không coi đây là kiểm tra backend remote mới nhất hoặc nghiệm thu API thật.

## Hai quyết định đã xác nhận

Duy Thái chọn “Chỉ hôm nay hoặc trước đó” cho ngày nghỉ và “Yêu cầu lưu hoặc hủy bản nháp trước” khi đang sửa hồ sơ. Quyết định lưu/hủy này khác với unlink được giữ nháp qua thao tác. Đã ghi WEB-EMP-EMPLOY-01/02; không tự dùng lại chính sách unlink cho nghỉ việc.

Mốc hôm nay là ngày nghiệp vụ Việt Nam UTC+7, đúng BusinessClock backend. Thao tác nghỉ việc có hiệu lực ngay; chưa làm hẹn ngày nghỉ tương lai. Thông tin account và quyền không tự đổi theo tình trạng nhân viên.

## Từng micro-task

1. **EMP-EMPLOY-01 — Ngày và contract.** Tách date-only schema để UI và wire contract dùng cùng kiểm ngày hợp lệ; giữ export cũ nên không đổi contract API đang chuẩn bị. Schema ngày nghỉ nhận clock để test biên UTC+7/năm mới, ngày nhuận, ngày trống/sai/tương lai và form mở qua nửa đêm.13 test đạt. Input end/reinstate chỉ có employeeId, version và ngày nghỉ nếu cần; service gửi tường minh các trường này, không spread thông tin cá nhân vào command.
2. **EMP-EMPLOY-02 — Model/repository/service.** Profile mock có employmentEndDate nullable; fixture Left cũ chưa có ngày dùng null và hiển thị thiếu thông tin, không bịa ngày lịch sử. Save cá nhân giữ ngày nghỉ, từ chối đổi status; trạng thái chỉ đổi qua command riêng. Mock kiểm quyền/phiên, ngày, version, same-status và các tham chiếu lao động sau ngày nghỉ. Backend không tính giao việc đã hủy, mock cũng loại trường hợp này; không xóa lịch sử. Thành công cấp version mới và clone response, không tự khóa/mở account hoặc sửa grant.
3. **EMP-EMPLOY-03 — UI.** Bỏ status select khi sửa, hiện trạng thái/ngày nghỉ và nút Nghỉ việc hoặc Đi làm lại. Khi form dirty, nút action bị khóa và có hướng dẫn lưu/hủy; Hủy thay đổi chỉ reset bản nháp về profile hiện có. Popup nghỉ việc có ngày mặc định hôm nay; popup đi làm lại yêu cầu xác nhận. Cả hai dùng service qua contract, pending tại chỗ và không tự lặp command. Profile form bị khóa khi popup mở, còn control trong popup vẫn dùng được vì không nằm trong fieldset disabled của profile.
4. **EMP-EMPLOY-03b — Race/pending.** Tracker chống submit lặp; pending ref chặn cancel ngay khi service nhận lệnh, trước khi React render pending. Dialog cha cũng kiểm ref đồng bộ để Escape không đóng editor đang theo dõi kết quả. Response về sau unmount không tạo toast/follow-up hoặc cập nhật UI cũ; không tuyên bố request server được hủy/rollback.
5. **EMP-EMPLOY-04 — Danh sách/follow-up.** Kết quả thành công cập nhật workspace/version, đóng editor và áp filter hiện có. Nghỉ việc chỉ nhắc khóa khi account đang Active; account Locked không nhắc khóa thêm. Đi làm lại có account thì nhắc kiểm tra quyền, trạng thái account vẫn giữ. Liên kết chứa accountId đã encode và màn account chỉ mở target có trong workspace được phép đọc; target lạ không mở nhầm một account khác. Không có mutation account do điều hướng này.

## MSG và phần vẫn chờ

Thêm MSG61 tiếng Việt cho yêu cầu chuyển tới trạng thái đã có. MSG11 của mock được dựng từ số tham chiếu fixture và ngày đã kiểm; không parse detail tiếng Anh backend hoặc coi mock count là số liệu QA. Bộ fixture lao động chỉ là tham chiếu test; runtime foundation đang có danh sách tham chiếu rỗng, chưa có module giao việc/chấm công web thật.

MSG06 và tên MSG24 structured tiếp tục chờ backend. Conflict mock vẫn dùng metadata audit hư cấu đã có, không tạo fallback cho API. API/refresh vẫn tắt; chưa thêm employment endpoint vào BFF/catalog, serializer/DTO thật hoặc đổi session/cookie/cache. Các field cần cho MSG11/61 và follow-up thật phải được kiểm khi triển khai API, không lấy UI mock này đóng gate.

## Lỗi thực tế và cách khắc phục

- `npm run typecheck` sau khi thêm model báo TS1360/TS2741/TS2322: fixture và response test cũ thiếu employmentEndDate; sau mở rộng interface có TS2739 thiếu endEmployment/reinstate ở mock service. Đây là các chỗ chưa migrate theo contract, không phải thiếu package. Đã bổ sung null rõ ràng, cập nhật mock methods và giữ model bắt buộc; không dùng any/optional để che lỗi. Typecheck kế tiếp đạt.
- Test status cũ đi qua save không còn là hành vi đúng. Hai ca nhắc tài khoản được chuyển sang end/reinstate, vẫn kiểm follow-up/account; bổ sung test save không được đổi status và save hồ sơ Left không làm mất ngày nghỉ. Không bỏ kiểm nghiệp vụ để làm test xanh.
- `npm run lint` báo5 lỗi react-hooks/refs “Cannot access refs during render” tại action.pending. Hook result chứa cả state/ref/getter, cách truy cập qua object action khiến bộ phân tích không phân biệt an toàn. Đã destructure kết quả: JSX dùng state pending/feedback, ref chỉ gắn vào element hoặc đọc trong event/effect. Không tắt rule; lượt lint kế đạt.
- Lượt test module đầu có2 fail/455 pass. Cả hai expected account Locked nhưng actual Active vì fixture employee ghi Locked, trong khi danh mục account gốc vẫn Active. Khi command bắt đầu đọc account hiện hành, hai bản fixture mâu thuẫn lộ ra. Đã sửa fixture ở cả hai nơi theo cùng trạng thái; không đổi assertion thành Active hoặc bỏ đọc dữ liệu mới. Lượt tiếp theo28 file/464 test đạt; còn chạy kiểm source cuối sau chỉnh service allowlist.

## Kiểm chứng

Các test bao phủ ngày/clock, chặn status qua save, end/reinstate/version mới, stale/same-status/concurrent command, MSG11, không tính assignment đã hủy, auth/expiry, account Active/Locked/không có account và trạng thái account thay đổi sau khi mở editor. UI kiểm cả lưu và hủy draft, ngày mặc định/tương lai, xác nhận/cancel, phiên hết hạn, kết quả không rõ, unmount, chống Escape/submit lặp tức thời và link tới đúng tài khoản. Không có dữ liệu cá nhân thật hoặc credential mới trong fixture này.

Đã kiểm source tách trên nền `19c47bc` cộng đúng 26 file liên quan (gồm lifecycle local trước đó), loại sửa đổi hồ sơ/thông báo/Dialog từ trước. Source cuối đối chiếu SHA-256: 26/26 file trùng thư mục làm việc. Full test và build chạy tuần tự.

| Kiểm tra | Kết quả cuối |
| --- | --- |
| `npm run lint` và `npm run typecheck` | Đạt |
| `npm test` | 2.157 đạt / 31 Redis skip; 176 file đạt / 4 file skip; 110,02 giây |
| `npm run build` | Đạt; tạo 18/18 trang |
| `npm run test:session-pages` | 24 HTTP assertions đạt |
| Hallmark static trên component mới | 0 FAIL / 0 REFLEX / 0 WARN |

Có 41 test mới: 13 ngày/schema, 15 repository, 2 service allowlist, 9 tương tác UI và 2 điều hướng tài khoản. Hai test cũ chuyển sang command riêng không tính là test mới. Tổng 2.157 gồm 12 test lifecycle trước đó, không gồm 14 test hồ sơ/thông báo local. Redis skip không chứng minh Redis runtime đạt; static audit không thay kiểm giao diện thực tế.

Log cuối giữ local tại `D:/Đồ_án/.omts-web-review-20261028/.hallmark/employment-review-{lint,types,tests,build,http}.log`. Preview production mock dùng port 3105; server 3000 của người dùng được giữ nguyên.

## Kiểm tra trên trình duyệt

Đã đăng nhập Owner mock, mở Nguyễn Văn An và sửa ghi chú: Nghỉ việc bị khóa khi có bản nháp; Hủy thay đổi trả form về dữ liệu đang lưu. Popup mặc định ngày 28/10/2026; nhập 29/10 bị chặn bằng MSG01. Xác nhận ngày hợp lệ cập nhật tình trạng/ngày nghỉ và đưa ra nhắc kiểm tra tài khoản. Link mở đúng `account-nguyen-an`; tài khoản vẫn hoạt động, không tự khóa. Chọn Để sau: An rời bộ lọc Đang làm việc và xuất hiện trong Đã nghỉ. Đi làm lại đưa An trở về Đang làm việc; chỉ nhắc kiểm tra quyền, không tự sửa account/grant.

Vòng chuyển trạng thái được kiểm trước hai chỉnh sửa CSS cuối (chiều rộng nút desktop, viền input lỗi). Sau build cuối đã kiểm lại popup/ngày tương lai, disabled và responsive:

| Viewport | Kiểm tra cuối |
| --- | --- |
| 1024 px | Document rộng 1009 px; dialog cha 751/751 px client/scroll, dialog con 510/510 px; input ngày dùng được, ô họ tên form nền bị khóa |
| 360 px | Document rộng 345 px; dialog cha 328/328 px, dialog con 343/343 px; ngày tương lai hiện lỗi và aria-invalid=true, không tràn ngang |

Ảnh local/ignore trong `.hallmark/`: `employment-profile-1024.png`, `employment-dialog-1024.png`, `employment-dialog-360.png`, `employment-date-error-360.png`. Input date theo locale trình duyệt; dữ liệu vẫn date-only, ngày đọc trên hồ sơ hiển thị dd/mm/yyyy. MSG11/concurrency/unmount được kiểm bằng component/repository tests, chưa có nguồn lao động thật để nghiệm thu browser.

## Giới hạn và tự đánh giá

Lỗi thao tác kiểm chứng cuối: chạy `git diff --check`/`git rev-parse` trong thư mục snapshot trả “not a git repository”. Snapshot là bản sao source để chạy kiểm tra, không có `.git`; đây không phải lỗi build hoặc mất repository chính. Đã chạy lại kiểm Git tại `D:/Đồ_án/omts-web`: diff-check đạt, không có file staged, HEAD vẫn `19c47bc`. So hash source thực hiện giữa hai thư mục đạt 26/26; các link tương đối trong bốn tài liệu review đều tồn tại. Cảnh báo CRLF→LF chỉ báo chuẩn hóa xuống dòng theo Git, không phải test thất bại.

Tự review chưa phát hiện lỗi mới còn mở trong phạm vi mock đã kiểm. Đã kiểm bản nháp → lệnh riêng → version mới → danh sách/follow-up; điều hướng không đổi account. Không dùng kết quả này kết luận toàn bộ LAB-01 hoặc API thật đã hoàn tất.

Chưa nghiệm thu .NET/QA, audit log bền vững, nguồn lao động thật, mapper MSG11/61/follow-up API hoặc create-login-account inline. Chưa đổi SRS/Jira hay đánh dấu LAB-01 Done; không merge develop. Hồ sơ/thông báo/Dialog local từ trước được giữ nguyên. Báo cáo và plan thuộc repo; kiến thức/bài115, ảnh và log tiếp tục local/ignore. Trạng thái giữ local ở phần kiểm ban đầu được thay bằng yêu cầu xuất bản trong lượt review dưới đây.

## Review trước commit/push — 28/10/2026

Đọc lại Jira OMTS-203 (To Do), OMTS-199 (Done) và parent OMTS-119 (In Progress). Phạm vi end/reinstate, version, follow-up và Owner không đổi. Hai lựa chọn ngày nghỉ/bản nháp đã được Duy Thái xác nhận; không cần chốt lại. Backend local vẫn `953f597`, sạch; không fetch/pull hoặc chạy DB trong lượt review này.

### EMP-EMPLOY-REV-01 — P2, đã sửa: gửi lệnh sau khi hủy validation

**Tình huống:** submit ngày hợp lệ rồi Hủy hoặc unmount trước khi `handleSubmit` gọi callback. Hai test tái hiện đều fail: `expected vi.fn() to not be called at all, but actually been called 1 times`. Service mock nhận lệnh endEmployment dù người dùng đã rời lượt xác nhận. Đây là lỗi trước request, khác với bỏ phản hồi của request đã được gửi.

**Nguyên nhân:** pending/tracker bắt đầu khi gọi `confirm`, trong khi resolver/RHF còn một bước bất đồng bộ trước đó. Hook đã bỏ phản hồi sau unmount, nhưng không có kiểm tra callback validation trước khi bắt đầu lệnh. Đổi state popup không vô hiệu hóa closure đang đợi.

**Cách sửa:** mỗi lượt validation có số thứ tự trong ref. Callback chỉ gọi confirm khi số đó còn hiện hành. Mở/đóng popup và cleanup khi unmount tăng số, nên callback cũ không thể gửi lệnh; đóng rồi mở lại cũng không cho callback cũ mượn lượt mới. Không hủy/hoàn tác request đã nhận hoặc thay điều kiện nghiệp vụ.

**Hồi quy:** hai test RED cho Hủy/unmount; thêm một test đóng–mở lại sau sửa. Cả file editor/unlink/employment đạt **39/39**. Lượt RED có 2 fail/36 skip (chỉ lọc hai test), không phải full suite hỏng. Log local `.hallmark/employment-review-cancel-red.log` và `employment-review-cancel-green.log`. Bài 116 giải thích Promise, closure, ref/state và câu hỏi bảo vệ; tiếp tục ignore.

### Phạm vi xuất bản và kiểm cuối

Commit gồm phần employee employment cùng phần tải/retry workspace đã làm local ngay trước đó, vì component cùng được sửa và cần giữ account-bound cleanup. Kèm thay đổi nhỏ mở đúng account từ follow-up, MSG61, decision đã chốt, plan/reviewer guide và hai báo cáo nhân viên. Không gom các sửa đổi hồ sơ/thông báo/Dialog dùng chung, proposal notification, `.env`, ảnh/log hoặc bài học local.

Source kiểm cuối vẫn tách từ nền `19c47bc` cộng 26 file liên quan; đã đối chiếu hash 26/26 file với source staged. Sau ba hồi quy, phần employment có **44 test mới**; cộng 12 test lifecycle từ lượt trước là 56 test mới so với nền. Full suite đạt **2.160 pass/31 Redis skip**, 176 file pass/4 file skip, **107,05 giây**. Lint/typecheck/build 18/18 và **24 HTTP assertions** đạt. Log cuối trong snapshot dùng tiền tố `employment-publication-`. Không dùng kết quả local này làm CI của commit mới.

Lệnh đọc nhầm `vitest.config.ts` báo không tìm thấy; `rg --files` xác nhận tên thật là `vitest.config.mts`. Không thêm config hay sửa dependency để chữa lỗi đọc sai đường dẫn. Không phát hiện lỗi nghiệp vụ mới cần người dùng quyết định trong phạm vi review này; API/refresh vẫn tắt, MSG06/tên MSG24 chờ backend. Không sửa scanner/history, không merge develop.

Kiểm Git phải chạy ở repo chính, không phải snapshot không có `.git`. Lượt fetch đầu đặt nhầm cwd snapshot đã dừng với “not a git repository”; chạy lại ở `omts-web` fetch nhánh thành công. Ref `origin/feature/...` không tồn tại vì repo chỉ cấu hình fetch tracking cho develop; so trực tiếp `HEAD...FETCH_HEAD` sau fetch đúng nhánh cho kết quả **0/0**, remote vẫn ở `19c47bc`. Không đổi fetch config, force-push hoặc ghi đè code người khác. Một lượt đọc log cũng dùng nhầm cwd repo chính; log được kiểm lại tại snapshot như đường dẫn nêu trên. Không có Gitleaks CLI local; không suy rằng secret scanner đã xanh, CI/incident cần kiểm riêng.

Smoke trên build cuối sau bản vá: đăng nhập Owner mock ở port 3105, mở An → Nghỉ việc → Hủy → mở lại → Hủy. Ngày mặc định đúng 28/10/2026; cả hai lần hủy đều giữ tình trạng Đang làm việc, trả focus về Nghỉ việc và giữ Lưu thay đổi disabled. Ảnh mới `.hallmark/employment-publication-popup.png` giữ local. Đây là kiểm native cho mở/hủy/mở lại; race trong cùng lượt validation được chứng minh bằng ba component tests, không giả nhận thao tác tay đã tái hiện chính xác thứ tự microtask. Luồng nghỉ/đi làm lại và responsive trước bản vá đã ghi ở phần trên; bản vá không đổi bố cục hoặc contract lệnh.

Tự đánh giá cuối: P2 EMP-EMPLOY-REV-01 đã đóng bằng test hồi quy; chưa thấy finding mới còn mở trong phạm vi đã kiểm. Xuất bản nhánh hiện tại theo yêu cầu; kiểm CI của SHA mới là bước riêng, chưa có kết luận CI trước khi GitHub chạy. Giữ toàn bộ giới hạn API/QA/Redis và incident lịch sử đã nêu, không merge develop.
