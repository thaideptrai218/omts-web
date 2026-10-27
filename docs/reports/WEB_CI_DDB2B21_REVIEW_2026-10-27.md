# Kiểm tra CI sau commit ddb2b21 — 27/10/2026

Nhánh `feature/OMTS-132-web-foundation`, [PR #3](https://github.com/thaideptrai218/omts-web/pull/3) vẫn OPEN/draft, chưa merge develop. Head đã kiểm: `ddb2b21ee41526ce8208b47acec51a4159b1bbad`. Working tree sạch tại preflight.

## Kết quả GitHub thực tế

| Check trên ddb2b21 | Kết quả | Bằng chứng |
| --- | --- | --- |
| build-test | SUCCESS | [Run 40475730782](https://github.com/thaideptrai218/omts-web/actions/runs/40475730782): npm ci, lint, typecheck, 1.632 tests PASS/31 Redis SKIP, build 18/18 trang và 24 HTTP assertions PASS |
| pr-title | SUCCESS | [Run 40475728301](https://github.com/thaideptrai218/omts-web/actions/runs/40475728301) |
| gitleaks | SUCCESS | [Run 40475730795](https://github.com/thaideptrai218/omts-web/actions/runs/40475730795) |
| GitGuardian Security Checks | FAILURE | Check run 122093354850: **17 occurrences, 6 incident IDs**, quét 23 commit trong PR |

Đây không phải lỗi test/build hoặc lỗi GitHub runner. Không sửa workflow, bỏ test, tăng timeout hay ghi status success để làm check xanh. Câu trong báo cáo trước rằng chỉ còn năm incident lịch sử đã thiếu: ddb2b21 có vị trí phát hiện mới và một incident mới; bảng dưới là kết quả mới hơn.

## Đối chiếu từng incident với source

Đọc output check run qua GitHub API, nhóm 17 dòng theo ID, rồi đọc cả source hiện tại và `git show` trên commit bị chỉ ra. Không đưa credential thật hoặc nội dung `.env.local` vào báo cáo.

| Incident | Số vị trí trong check này | Source đã đối chiếu | Kết luận review/đề xuất phân loại |
| --- | --- | --- | --- |
| [38252611](https://dashboard.gitguardian.com/workspace/846924/incidents/38252611) | 12 | c2415cc và ddb2b21: runtime login test, mock review flows, mock account-security composition, AuthProvider test và mock directory | Credential demo công khai dùng trong RAM/test; không lấy từ backend. Đề xuất **Test credential** sau khi chủ workspace xác nhận đúng giá trị trong incident |
| [38275825](https://dashboard.gitguardian.com/workspace/846924/incidents/38275825) | 1 | 56ba7f4: password-schema test, case mật khẩu mới/nhập lại không khớp | Chuỗi thử validation, không đăng nhập hệ thống; đề xuất **Test credential** |
| [38275826](https://dashboard.gitguardian.com/workspace/846924/incidents/38275826) | 1 | Cùng schema test và commit như trên | Chuỗi thử validation; đề xuất **Test credential** |
| [38314032](https://dashboard.gitguardian.com/workspace/846924/incidents/38314032) | 1 | 79066ed: bảng ký tự của bộ sinh mật khẩu mock | Alphabet công khai, không phải một mật khẩu hay API key; đề xuất **False positive (not a secret)** |
| [38314033](https://dashboard.gitguardian.com/workspace/846924/incidents/38314033) | 1 | 79066ed: defaultCredential trong provisioning mock | Credential giả cố định cho demo, không phải bootstrap Owner backend; đề xuất **Test credential** |
| [39141309](https://dashboard.gitguardian.com/workspace/846924/incidents/39141309) | 1 | ddb2b21: session-hydration contract fixture, dòng 78; fake resolver/transport, identity/username/token stand-in | Không có network, DB hoặc token thật trong fixture. Đề xuất **False positive**, cần xem tuple được detector trích trong dashboard trước khi đóng incident |

Tổng 12+1+1+1+1+1 = 17. Không gọi đây là 17 credential production bị lộ. Kết luận giới hạn trong source và các vị trí check này chỉ ra; không thay cho audit mọi secret trong toàn repo hoặc kiểm giá trị riêng trên dashboard GitGuardian.

## Kiểm tra bảo mật bổ sung

Không tìm thấy lỗi application cần đổi logic trong lượt này. Thêm ba regression cases ở `src/server/auth/session-hydration.contract.test.ts` để kiểm điều GitGuardian không chứng minh: response HTTP BFF không làm rò trường nhạy cảm từ backend.

Hai case gửi thêm password/hash/token/connectionString/credentials giả vào DTO identity hoặc permissions; kiểm **raw HTTP JSON trước parser browser** vẫn trả đúng projection, không có tên trường hoặc giá trị nhạy cảm, giữ no-store. Case thứ ba làm transport ném exception chứa giá trị giả: response chỉ trả unavailable/503, không echo exception. Sentinel được tạo lúc test chạy bằng randomUUID; không có credential thật hoặc network call.

Các case này PASS với source hiện tại, không tuyên bố đã tìm/sửa một lỗi rò dữ liệu có thật. Chúng giữ ranh giới đã đúng khỏi bị phá khi backend thêm trường sau này. Targeted reader/schema/HTTP/hydration: **72 PASS**. Sau định dạng file, chạy lại riêng hydration: **11 PASS**. Prettier chỉ định dạng file test này, không đổi dependency/lockfile.

| Kiểm tra local của lượt bổ sung | Kết quả |
| --- | --- |
| Full suite | 148 files PASS, 4 SKIP; **1.635 tests PASS, 31 Redis SKIP**, 83,58 giây |
| Lint / typecheck | PASS |
| Production build | PASS: 18/18 trang, static generation 735 ms |
| HTTP smoke trên build cuối | PASS: 24 assertions |
| Markdown local links và diff | 194 liên kết hợp lệ; git diff --check PASS |

Không chạy Redis/QA/HTTPS hoặc browser lại vì không đổi product UI/runtime; không gọi các phần đó đã nghiệm thu. Tự review diff chỉ có test và tài liệu, không thay workflow/policy bảo mật hoặc nghiệp vụ. Đã đọc lại Jira OMTS-132/parent OMTS-121; không đổi trạng thái của ticket.

## Bước cần chủ workspace GitGuardian thực hiện

1. Mở lần lượt sáu liên kết incident ở bảng; xem đúng giá trị, source và occurrence để xác nhận kết luận.
2. Với credential demo/test đã xác minh, chọn Ignore với lý do **Test credential**. Với alphabet hoặc tuple không phải secret, chọn **False positive**, ghi lý do và tham chiếu báo cáo này. Nếu phát hiện bất kỳ giá trị nào đang được dùng trên backend/QA/production, phải dừng phân loại false positive và xử lý revoke/rotate credential đó tại nơi phát hành.
3. Chạy lại GitGuardian check và kiểm head mới; chỉ kết luận xanh khi GitHub thực sự báo SUCCESS. Không cần sửa lịch sử Git để xử lý một false positive đã xác minh.

Theo [tài liệu chính thức GitGuardian](https://docs.gitguardian.com/internal-monitoring/prevent/detect-secrets-in-real-time-in-github), PR được quét theo từng commit, không chỉ trạng thái source cuối; incident được đóng trên dashboard không còn bị đưa vào check run. Vì vậy commit xóa chuỗi hiện tại không tự xóa occurrence trong lịch sử.

Agent đọc được kết quả check qua GitHub, nhưng không có kết nối GitGuardian được cấu hình để phân loại incident; chưa thực hiện thao tác Ignore/Skip hoặc thay đổi trạng thái incident. Không tắt scanner, không loại trừ cả tests/mocks, không đổi check sang Neutral, không thêm ignore config mới và không force-push/rewrite history.

## Bàn giao

Ghi chú học giữ local trong bài100; báo cáo và ba test bổ sung được commit/push trên nhánh hiện tại. API/refresh vẫn tắt; PR giữ draft, chưa merge develop. Kết quả GitHub của commit kế tiếp phải được kiểm riêng, không suy từ ddb2b21 hoặc checks local.
