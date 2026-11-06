# Sửa cuộn nền khi mở popup — 27/10/2026

Nhánh `feature/OMTS-132-web-foundation`; xử lý P3 `POLISH-REV-03`. Giữ nghiệp vụ và form hiện tại, không bật API/refresh, không merge develop. Lượt push này bao gồm các thay đổi mock/chuẩn bị BFF và polish đã được review ở các báo cáo trước nhưng còn local; ghi chú học và ảnh vẫn không đưa lên Git.

## Nguyên nhân và cách sửa

`Dialog` dùng native `showModal()` và có `overflow-y-auto`. Native modal chặn tương tác với nền nhưng không tự bảo đảm trang nền hết thanh cuộn. Menu điện thoại lại tự ghi `document.body.style.overflow`, nên thêm một khóa riêng cho từng popup có thể làm khóa của menu và popup ghi đè nhau.

Thêm `useDocumentScrollLock`: mỗi document có một bộ đếm các lớp đang mở. Lớp đầu tiên đặt thuộc tính `data-omts-scroll-locked` trên `html`; CSS khóa overflow của root và body, giữ gutter để hạn chế xê dịch ngang. Đóng một lớp chỉ giảm bộ đếm. Lớp cuối cùng khôi phục thuộc tính trước đó. Không sửa inline style, không fixed body và không gọi scrollTo, nên không chủ động đưa nền về đầu trang. Hook chạy trong effect phía client, không đọc document khi render server.

`Dialog` và menu điện thoại dùng chung hook. Popup vẫn cuộn nội dung riêng; Escape, xác nhận lồng nhau, pending/dismissible và bản nháp giữ luồng hiện có. Cleanup giải phóng khóa khi unmount và cân bằng được vòng setup/cleanup thêm của React Strict Mode.

## Test hồi quy và tự review

Trước sửa, `npx vitest run src/components/ui/dialog-scroll-lock.test.tsx` trả 5 FAIL/1 PASS: các case mở popup/giữ khóa sau khi đóng lớp con/unmount/Strict Mode/cancel đều thiếu marker khóa. Sau sửa, targeted 5 files đạt 26 PASS. Bổ sung thêm case khôi phục marker có sẵn và menu dùng chung khóa sau lượt targeted đầu.

Bảy case mới ở dialog kiểm mở/đóng, xác nhận con, hai popup độc lập đóng khác thứ tự, Strict Mode và unmount, giữ nguyên style/vị trí cuộn, khôi phục marker ban đầu, và chỉ nhả khóa khi controlled parent thật sự đóng. Một case mới ở AppShell kiểm menu và popup không giải phóng khóa của nhau, kể cả unmount.

Unit test jsdom kiểm vòng đời/ownership của marker, không đo được layout hoặc bánh xe cuộn thật. Browser check là bằng chứng riêng cho CSS và cuộn; chưa suy từ test marker rằng Safari/iOS hoặc mọi browser đã được nghiệm thu.

## Kết quả cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Full `npm test` trên source cuối | 148 files PASS, 4 SKIP; **1.632 tests PASS, 31 Redis SKIP**, 105,65 giây |
| Lint / typecheck | PASS |
| Production build | PASS: 18/18 trang, static generation 941 ms |
| `npm run test:session-pages` | PASS: 24 HTTP assertions trên build cuối |
| Browser 360×800 và 1024×768 | PASS trong các đường đi mô tả dưới đây |
| `git diff --check` | PASS |

Ở 360 px, form Nguyễn Văn An có clientWidth/scrollWidth cùng 328 px; root/body đều overflow hidden. Cuộn nội dung làm popup scrollTop từ 0 lên 480 trong khi nền đứng tại scrollTop 412. Mở xác nhận bỏ liên kết tạo hai dialog; Escape lần đầu còn một dialog và khóa nền, Escape lần hai còn zero dialog, bỏ marker, overflow trở về visible và nền vẫn ở 412. Không xác nhận bỏ liên kết hoặc thay dữ liệu nhân viên.

Ở 1024 px, popup rộng 751 px, chỉ vùng popup có thanh cuộn; gutter nền được giữ trống. Thử cuộn ở vùng nền bên ngoài popup không đổi scrollTop 39,2. Root scrollWidth 1009 không vượt clientWidth 1024 khi khóa; không có tràn ngang. Sự chênh clientWidth trước/sau khóa là cách trình duyệt tính gutter khi overflow hidden, không tự suy đó là nội dung bị giãn.

Menu điện thoại khóa nền khi mở; đóng menu vẫn mở popup tiếp được. Điều hướng từ menu về dashboard không còn marker hoặc dialog đang mở. Đã trả viewport về kích thước gốc và giữ tab review. Ảnh local ignored: `.hallmark/polish-2026-10-27/scroll-lock-360.png` và `scroll-lock-1024.png`. Server production review ở `http://127.0.0.1:3000`.

Tự review không tìm thấy lỗi mới trong phạm vi đã kiểm. Không gọi kết quả này là nghiệm thu mọi browser: chưa kiểm Safari/iOS, bàn phím ảo hoặc thiết bị cảm ứng thật. Không có phụ thuộc mới hoặc thay đổi policy bảo mật.

Commit/push được thực hiện sau các kiểm tra này trên nhánh hiện tại; giữ PR draft, chưa merge develop. Hash và kết quả push được báo khi lệnh Git hoàn tất. GitHub CI/GitGuardian là kết quả riêng sau push, không được suy từ checks local.

## Phạm vi bàn giao

Đã đọc lại Jira OMTS-201 và ngữ cảnh parent OMTS-118: vẫn In Progress, không thay trạng thái. Lỗi cuộn là UI và không cần đổi SRS/Figma/nghiệp vụ. Git remote của checkout chỉ cấu hình tracking develop; `git fetch origin` trả feature về FETCH_HEAD, so HEAD với FETCH_HEAD tại preflight là 0/0. Không force-push hoặc sửa lịch sử để tạo remote-tracking ref.

API, refresh, Redis/HTTPS và policy vai trò backend vẫn là các phần chờ riêng. Không gọi local checks là CI; các cảnh báo GitGuardian lịch sử vẫn cần phân loại theo báo cáo trước, không thêm exception để che chúng.
