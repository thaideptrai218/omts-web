# OMTS-159 — Báo cáo B2.1: rà soát nguồn cho SCR-03

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Branch: `feature/OMTS-132-web-foundation`
>
> Phạm vi: phân tích Jira/SRS và chia micro-task trước khi mở rộng code đăng nhập

## 1. Kết luận điều hành

B2.1 đã hoàn thành ở mức **source review**. Luồng frontend đã được xác định đủ để bắt đầu thiết kế domain trong B2.2, nhưng chưa có code mới cho OMTS-159 và không được coi là UI-ready hoặc Jira-ready.

Các kết luận đã xác nhận:

1. Identifier đăng nhập là username, số điện thoại đã xác minh hoặc email đã xác minh theo SCR-03 và quyết định `WEB-AUTH-01`.
2. Staff ở lần đăng nhập đầu dùng username cùng temporary password.
3. Sau khi credentials hợp lệ, nếu đồng thời có nhiều điều kiện bắt buộc thì thứ tự là đổi temporary password trước, sau đó xác minh phone.
4. Application shell và menu nghiệp vụ chỉ được mở sau khi người dùng đã qua các gate bắt buộc.
5. Menu phải dựa trên effective permissions/zone scope, không suy diễn từ tên role.
6. DTO, tên field, thời điểm phát token và URL đích chưa được xác nhận; các nội dung này vẫn thuộc `WEB-AUTH-02` và chưa được tự quyết trong frontend.

## 2. Nguồn đã đối chiếu

- Jira [`OMTS-159`](https://welterial.atlassian.net/browse/OMTS-159): form đăng nhập, MSG01/12/13/68/69, forced-password gate, phone-verification gate, menu theo quyền và tiêu chí QA account.
- Jira [`OMTS-132`](https://welterial.atlassian.net/browse/OMTS-132): foundation, auth state, permission navigation và API boundary mà OMTS-159 phụ thuộc.
- `Report3Finnal.md`: UC02, SCR-03, BR-32, BR-34 và MSG01/04/12/13/16/67/68/69.
- `docs/decisions/OPEN_QUESTIONS.md`: `WEB-AUTH-01` đã chốt phương án B; `WEB-AUTH-02` đang deferred.
- Code hiện tại trong `src/features/auth/`, `src/features/verification/` và `src/shared/messages/`.

Figma node `2:43` không được đọc lại trong micro-task này vì Jira, SRS và quyết định đã đủ để xác định hành vi; Figma chỉ là tham khảo hình thức và không được dùng để thay đổi nghiệp vụ.

## 3. Chênh lệch và điểm cần lưu ý

### 3.1 Chênh lệch câu chữ về số điện thoại

UC02 Normal Flow viết `username, phone number or verified email`, trong khi SCR-03 viết `username, verified phone number or email`. Quyết định `WEB-AUTH-01` đã xử lý điểm mơ hồ này: số điện thoại và email chỉ được dùng làm identifier sau khi đã xác minh; Staff first login phải dùng username.

Đây không còn là câu hỏi mở cho UI mock. Nếu backend hiện thực khác, nhóm phải đưa chênh lệch trở lại SRS/quyết định thay vì âm thầm đổi helper text hoặc mock behavior.

### 3.2 Code hiện tại chưa đủ biểu diễn post-login gate

`LoginResult` hiện chỉ có `authenticated` và `rejected`. `LoginExperience` chuyển thẳng tới `/dashboard` khi nhận kết quả authenticated. Cấu trúc này phù hợp với foundation demo nhưng chưa mô tả được hai gate bắt buộc.

B2.2 cần tạo một domain result trung lập cho bốn ý nghĩa:

- yêu cầu bị từ chối;
- phải đổi temporary password;
- phải xác minh phone;
- được phép vào application.

Tên của domain result không được coi là field API. HTTP adapter sau này chịu trách nhiệm dịch DTO thật sang kiểu domain này.

### 3.3 Message catalog còn thiếu

Catalog hiện có MSG01, MSG04, MSG12, MSG15, MSG16 và MSG19. OMTS-159 còn cần MSG13, MSG67, MSG68 và MSG69. B2.2 sẽ bổ sung theo nội dung SRS trước khi mock adapter tạo các nhánh lỗi.

### 3.4 Lỗi đường dẫn tài liệu

Lệnh rà soát ban đầu thử đọc `docs/FRONTEND_SCREEN_STRATEGY.md` và PowerShell trả `Cannot find path ... because it does not exist`.

- Nguyên nhân gốc: tham chiếu này đến từ hướng dẫn workspace cũ, không phải file đang tồn tại trong repo Web.
- Ảnh hưởng: không ảnh hưởng build hay kết quả nghiệp vụ vì nguồn thực tế đã được lấy từ project context, implementation plan, UI blueprints, Jira và SRS.
- Cách xử lý: không tạo file giả; ghi nhận đây là stale reference và dùng các tài liệu hiện có.

### 3.5 Lỗi whitespace trước commit

Lần chạy đầu của `git diff --cached --check` báo `trailing whitespace` tại hai dòng metadata đầu báo cáo. Nguyên nhân là Markdown dùng hai dấu cách cuối dòng để ép xuống dòng. Cách trình bày này render được nhưng vi phạm quy tắc sạch của diff. Hai dòng đã được đổi thành blockquote tách đoạn, sau đó file được stage và kiểm tra lại. Lỗi này không ảnh hưởng runtime nhưng cần sửa trước commit để CI/reviewer không nhận một diff có lỗi định dạng.

## 4. Thay đổi đã thực hiện

- Cập nhật `docs/WEB_IMPLEMENTATION_PLAN.md`: đánh dấu B2.1 hoàn thành và chia B2.2–B2.8 thành các bước domain, form, mock, gate, permission, test và QA integration.
- Cập nhật `docs/PROJECT_CONTEXT.md`: ghi nhận luồng bốn kết quả và thứ tự gate.
- Tạo learning note local `docs/learning/18-login-context-and-domain-outcomes.md`; file được `.gitignore` và không đi vào commit nhóm.
- Không thay đổi source code, mock behavior, route, session hay Jira status.

## 5. Bằng chứng kiểm tra

| Kiểm tra | Kết quả | Ý nghĩa |
| --- | --- | --- |
| `git diff --check` | Đạt | Không có whitespace error trong diff |
| `git check-ignore docs/learning/18-login-context-and-domain-outcomes.md` | Đạt | Tài liệu học chỉ nằm local |
| `npm test -- --run` | 7 files, 35/35 tests đạt | Baseline hiện tại không bị ảnh hưởng |
| `npm run lint` | Đạt, 0 warning | Source hiện tại vẫn đạt lint |
| `npm run typecheck` | Đạt | Route types và TypeScript hợp lệ |
| `npm run build` | Đạt với Next.js 16.4.0 | Production build hiện tại thành công |

Các kiểm tra trên không chứng minh các post-login gate đã hoạt động, vì B2.1 chưa thay đổi code và QA API chưa được tích hợp.

## 6. Trạng thái nghiệm thu

- B2.1 source review: **Đạt**.
- B2.2 domain/message implementation: **Chưa thực hiện**.
- OMTS-159 UI-ready: **Chưa đạt**.
- OMTS-159 Jira-ready: **Chưa đạt**.
- Jira status: giữ nguyên `To Do`; không tick/chuyển ticket trong lượt này.

## 7. Rủi ro còn mở

1. `WEB-AUTH-02`: chưa có login response contract, token timing và route strategy.
2. QA API/test accounts: chưa có bằng chứng chạy được từng gate theo `Done when`.
3. `/me/permissions`: payload thật chưa được xác nhận.
4. Protected route hiện vẫn client-gated; request chưa đăng nhập tới `/dashboard` còn có thể nhận HTTP 200. Đây là blocker từ foundation, không được giải quyết trong B2.1.

## 8. Tự đánh giá công việc B2.1

**Điểm: 4,7/5.**

- Độ bám nguồn: 5/5 — có Jira, SRS, decision log và code hiện tại.
- Phân biệt confirmed/deferred: 5/5 — không tự chốt contract bảo mật/backend.
- Khả năng hành động: 5/5 — bước tiếp theo đã được chia nhỏ và có thứ tự.
- Bằng chứng kỹ thuật: 4,5/5 — baseline đầy đủ, nhưng chưa có test mới vì chưa sửa code.
- Bao phủ thực tế: 4/5 — chưa kiểm tra QA API, QA account hoặc post-login UI; đây là giới hạn đúng phạm vi chứ không phải nội dung đã hoàn thành.

## 9. Tự đánh giá chất lượng báo cáo

**Điểm: 4,6/5.**

Báo cáo có thể truy vết nguồn, nêu rõ chênh lệch, tách kết quả phân tích khỏi trạng thái triển khai và không tuyên bố ticket hoàn thành quá sớm. Điểm còn thiếu là chưa thể đính kèm evidence từ QA API hoặc ảnh chụp gate vì các phần đó chưa được code. Báo cáo cũng chỉ mô tả Figma là nguồn tham khảo, không khẳng định đã đọc lại node trong lượt này.

Quyết định sau tự review: báo cáo đủ điều kiện commit/push cho B2.1; không đủ điều kiện tạo tuyên bố “OMTS-159 hoàn thành” hoặc chuyển Jira.

## 10. Bước kế tiếp

Thực hiện B2.2: thêm MSG13/67/68/69, thiết kế discriminated union cho login outcome và viết unit test cho từng outcome. B2.2 không điều hướng route và không quyết định token/session contract.
