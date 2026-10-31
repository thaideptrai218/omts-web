# G1 — Giao thức phối hợp đăng nhập để review

Ngày27/10/2026. **Duy Thái đã đồng ý hướng G1 và triển khai contract/fixture trước; chưa nghiệm thu runtime.** Browser thiếu Web Locks sẽ bị chặn đăng nhập API và được hướng dẫn cập nhật. Phạm vi W3.1b4/W3.4/W4; không sửa .NET API, SRS hoặc Jira từ tài liệu này.

Contract `login-ledger.ts` và RAM reference model trong `__tests__` đã được thêm, có9 cases. Chưa tạo cookie điều phối, route bootstrap, Redis adapter hoặc Web Locks adapter; các phần thiết kế dưới đây mô tả đích cần kiểm, không phải toàn bộ code đã chạy. Sau đó Duy Thái ưu tiên bản trình diễn các luồng quản trị; phần runtime G1 vẫn theo plan API.

## Hành vi đã chốt và phạm vi của “một trình duyệt”

Duy Thái đã chọn một lượt login đang chờ; tab khác chờ rồi kiểm tra lại phiên, mất phản hồi không tự gửi lại mật khẩu. Phiên hợp lệ được giữ; đổi tài khoản phải logout trước.

G1 đề xuất áp dụng cho các tab OMTS cùng origin và cùng vùng lưu trữ của một browser profile. Cửa sổ ẩn danh hoặc profile khác có phiên độc lập; không cố nhận diện một máy bằng IP/username. “Một trình duyệt” không đồng nghĩa tất cả thiết bị dùng chung Wi-Fi. Phạm vi kỹ thuật này phải được ghi trong tiêu chí browser acceptance, không gọi chung mọi cửa sổ Chrome là cùng một phiên.

## Cái gì và tại sao cần hai lớp

**Browser:** đề xuất một Web Lock độc quyền có tên cố định cho các thao tác thay đổi vòng đời auth. Tab được lock phải kiểm tra phiên trước; tab khác chờ, sau khi được lock đọc lại phiên, không tự gửi lại credentials đã giữ từ lần bấm trước. Không dùng steal lock hoặc timer browser tự kết luận server đã hoàn tất. Web Locks phối hợp các context trong cùng phạm vi origin/storage; đó không phải khóa trên Next workers. [W3C Web Locks](https://www.w3.org/TR/web-locks/), [MDN về secure context và hỗ trợ](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

**BFF/Redis:** đề xuất một bản ghi điều phối cho browser để các worker cùng kiểm attempt và generation trước khi công bố SID. TTL chỉ giúp dọn/giới hạn việc giữ khóa; worker chậm phải bị từ chối khi attempt/generation không còn khớp. Tài liệu Redis cũng lưu ý lock có hạn dùng cần cơ chế ngăn chủ cũ ghi tiếp, không mặc định process còn sống là vẫn giữ lock. Đây là áp dụng đề xuất cho OMTS, chưa phải bằng chứng adapter hiện có đáp ứng giao thức này. [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/).

## Cookie điều phối bổ sung — cần duyệt trước code

Hiện cookie SID chỉ có sau khi tạo phiên. Hai request anonymous chưa có một mã chung tin cậy để BFF biết chúng thuộc cùng browser. G1 đề xuất cookie riêng mang256bit ngẫu nhiên do server cấp; tên dự kiến `__Host-omts_web_auth_context` trên HTTPS, tên dev riêng theo cấu hình loopback hiện hữu.

Đề xuất thuộc tính cùng hướng C1A: HttpOnly, Path=/, SameSite=Lax, Secure ở HTTPS, không Domain, không biến thành cookie đăng nhập dài hạn. Không đưa raw context ID vào JSON, log, URL, BroadcastChannel hay localStorage. Redis chỉ dùng hash của ID làm định danh bản ghi. Cookie không chứa username, mật khẩu, OTP, JWT hoặc quyền.

**Nó không phải bằng chứng đăng nhập:** vẫn cần SID hợp lệ và dữ liệu phiên. Không dùng cookie điều phối để tự cấp lại SID bị mất hoặc trả hồ sơ của account. Nếu chỉ cần context cookie mà khôi phục được SID, nó đã trở thành một credential khác; G1 không đề xuất hành vi đó.

Thêm cookie và bước bootstrap là thay đổi hợp đồng session nên phải duyệt riêng. Chưa sửa cookie helpers/config hiện tại.

## Bản ghi Redis dự kiến

| Trường | Ý nghĩa |
| --- | --- |
| contextHash | Nhóm các request của cùng context cookie, không dùng IP/username |
| generation | Số lượt trong bản ghi còn tồn tại, tăng khi lượt cũ bị vô hiệu hóa |
| attemptId | Mã ngẫu nhiên server tạo cho đúng lượt đang xử lý |
| state | Idle / Pending / CheckRequired / Active / Revoked, chỉ là trạng thái kỹ thuật BFF |
| activeSessionHash | SID hash được công bố cho lượt hiện tại, không lưu raw SID để cấp lại từ context |
| deadline/expiry | Ngân sách đang chờ và hạn bản ghi, tính bằng clock server theo contract sẽ kiểm |

Generation phải được so cùng attemptId trong một thao tác Redis nguyên tử, không GET/check rồi SET rời. Bản ghi mất/expiry không được tự tạo lại dưới cùng contextHash rồi đặt generation về0: worker cũ có thể trùng số lượt. Thiếu ledger phải từ chối lượt cũ; bootstrap context mới dùng ID mới. Đây là yêu cầu chống việc dùng lại một mã trạng thái cũ, không phải cơ chế restore Redis production đã hoàn tất.

Chưa chọn con số TTL tùy ý. Contract tiếp theo phải bảo đảm ledger Active không mất trước phiên C3A mà nó kiểm, lease hết không tự cho phép replay POST, và bản ghi thiếu không mở lại session. Tham số Pending/Idle phải được nêu rõ và test trước activation; không lấy TTL Redis làm bằng chứng .NET đã thu hồi phiên.

## Luồng đề xuất

1. **Vào thao tác auth:** lấy Web Lock. Nếu thiếu capability/secure context thì không tự fallback sang biến RAM hay localStorage lock; hành vi browser không hỗ trợ cần chốt riêng.
2. **Bootstrap:** BFF kiểm CSRF C2A rồi cấp context cookie nếu chưa có. Cookie/context hợp lệ đang tồn tại không bị ghi đè. Nếu bootstrap mất phản hồi, dừng để đối chiếu; không bắt đầu POST credentials khi chưa xác nhận context. Tên route bootstrap/status là contract BFF cần xác lập, không phải route SRS đã có.
3. **Kiểm tra trước login:** GET session vẫn là nguồn xác định có phiên. Hợp lệ thì giữ phiên. Pending/CheckRequired chỉ cho chờ/kiểm tra, không tự resend credentials. Một tab đã chờ mà đọc ra anonymous không tự gửi password cũ; người dùng chủ động bấm lại sau khi trạng thái cho phép.
4. **Bắt đầu một lượt:** Redis đổi Idle→Pending với generation/attemptId trong một thao tác. Chỉ worker thắng mới gọi backend login. Worker khác không được gọi login rồi mới tranh ghi cookie. Credentials chỉ sống trong request; không queue/broadcast để tab khác gửi hộ.
5. **Tạo và công bố:** service kiểm identity/permissions/gate rồi tạo candidate SID mới và mã hóa token như hiện tại. Chỉ công bố activeSessionHash nếu generation/attemptId vẫn khớp; thất bại phải chặn cookie và cleanup candidate best effort. Session đã create nhưng chưa publish chưa được resolver coi là phiên dùng được.
6. **Kiểm phiên:** resolver/DAL phải kiểm SID đang khớp context Active và lượt được công bố, bên cạnh store/expiry/identity hiện tại. Kết quả cũ sau khi generation đổi không được dùng để hydrate. Kiểm ngay trước response giảm race nhưng không rút lại dữ liệu đã gửi trước logout.
7. **Mất phản hồi/crash:** chuyển hoặc giữ trạng thái cần đối chiếu; không coi lease hết là có thể login lại tự động. GET chỉ xác minh phiên có dùng được hay không. Nếu server đã tạo session nhưng token response mất, cleanup upstream có thể không thực hiện được; không báo chắc chắn đã revoke.
8. **Logout:** cần ghép cùng W4: làm context/session không dùng được trước khi chờ logout upstream. Thu hồi không xác định, offline queue và cookie clear muộn vẫn theo quyết định riêng. Chưa lấy G1 để tự chốt offline/revocation debt.

## Phản hồi cookie về muộn: bảo đảm và giới hạn

Ví dụ A đã bị vô hiệu hóa, B là session hiện hành, response A đến sau và browser lưu lại SID A. CAS Redis không thể sửa trực tiếp hành vi Set-Cookie trong browser. G1 đề xuất SID A bị từ chối vì không còn khớp lượt/context Active; **không hiển thị A**.

Đổi lại, browser có thể phải kiểm lại/khôi phục đăng nhập dù B đã tạo thành công. G1 chưa có cách tự cấp lại SID B từ context cookie và không tuyên bố bảo đảm mọi response cũ đều vô hại với trải nghiệm. Cookie clear cũ cũng có thể làm mất cookie mới; cần test và duyệt UX trước product mount. “Không nhận nhầm tài khoản” và “không bao giờ gián đoạn phiên” là hai tiêu chí khác nhau.

Bootstrap cũ về sau context mới cũng phải được test: cặp SID/context không khớp phải bị từ chối, không tự liên kết cookie cũ với account mới. Không viết test chỉ đảo callback JSON rồi gọi đó là kiểm cookie race.

## Cổng kiểm chứng và micro-task

| Bước | Sản phẩm cần có | Tiêu chí kiểm |
| --- | --- | --- |
| G1.0 | Chốt cookie bổ sung và cách xử lý browser thiếu Web Locks | Decision register có câu trả lời, không suy từ quyết định hành vi |
| G1.1 | Contract trạng thái/attempt, clock/TTL và policy đối chiếu | RAM fixture: hai callers, old generation, unknown outcome, missing ledger/ABA; chưa runtime RAM |
| G1.2 | Redis adapter công bố/vô hiệu hóa nguyên tử | Hai owners/workers độc lập cùng Redis, worker chậm không publish; verify failure/TTL, không chỉ mock Lua |
| G1.3 | Browser lock adapter + request generation | Hai tab thực, không gọi credentials từ tab chờ, tab đóng/abort/không hỗ trợ |
| G1.4 | Bootstrap/login/status/logout fixture Next | Cookie header nhận thật, response cũ sau auth mới, SID/context mismatch, no secrets/PII logs |
| G1.5 | Review lại cookie, CSRF, C3A, gate/backend và UI capability | Đạt mới mount API; chưa đổi env hoặc mở live refresh |

Không thay session store/schema/AES associated data qua một patch nhỏ không review. Hiện store chỉ có create/read/CAS/revoke cho từng session; nó chưa có ledger/publish được mô tả ở trên. Nếu deploy Redis Cluster hoặc restore/failover được chọn sau, phải đánh giá lại cách bố trí key/atomicity và lịch sử generation; G1 không tự chọn Redlock hay bảo đảm failover production.

## Hội đồng hỏi — sinh viên trả lời

**Có Web Lock rồi cần Redis làm gì?** Browser phối hợp thao tác các tab, còn nhiều worker Next dùng dữ liệu chung ở server. Request đã tới server vẫn có thể tiếp tục sau khi tab đóng; worker cũ cần bị kiểm attempt/generation trước khi công bố phiên.

**Vì sao không khóa theo IP hoặc tên đăng nhập?** Cả HTX có thể dùng chung Wi-Fi; khóa IP sẽ làm người khác chờ nhầm. Cùng browser lại có thể nhập hai username khác nhau, nên khóa username không nhóm đúng hai request đó.

**Số lượt có chặn browser nhận cookie cũ không?** Không. Nó giúp server từ chối SID không còn hiện hành; browser vẫn có thể bị gián đoạn do cookie cũ. Test thật và UX đối chiếu là phần phải làm, không bỏ qua bằng cách chỉ kiểm React state.
