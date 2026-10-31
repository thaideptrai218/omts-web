# Báo cáo rà soát UI/UX Web OMTS như một sản phẩm thực tế

> Ngày rà soát: 21/10/2026  
> Phạm vi: application shell, dashboard, hồ sơ cá nhân, quản lý nhân viên, tài khoản nội bộ, vai trò và quyền, trạng thái đăng xuất  
> Trạng thái: đã ghi nhận và đề xuất hướng xử lý; chưa sửa code trong đợt rà soát này

## 1. Mục tiêu của đợt rà soát

Foundation không được hiểu là giao diện minh họa sơ sài. Foundation phải tạo ra nền móng đủ chắc để các màn sau có cùng ngôn ngữ thiết kế, cùng mô hình danh tính và cùng cách xử lý trạng thái.

Đợt rà soát này tập trung vào ba câu hỏi:

1. Người dùng có hiểu mình là ai, đang làm việc cho đơn vị nào và đang giữ vai trò gì không?
2. Mỗi trang có giúp người dùng hoàn thành công việc hay chỉ đang trình bày cấu trúc kỹ thuật?
3. Khi thao tác lỗi, chờ lâu hoặc dùng màn hình nhỏ, giao diện có còn an toàn và dễ hiểu không?

## 2. Các quyết định UI đã được Duy Thái xác nhận

- Các card trong màn danh sách không tiếp tục mở form dài ở cột bên cạnh hoặc phía dưới. Tạo mới, xem và chỉnh sửa sẽ mở trong modal/dialog phù hợp.
- Dashboard phải hiển thị thông tin vận hành và số liệu có nguồn rõ ràng; không giữ banner giới thiệu chung chung.
- Sidebar thu gọn phải tự mở tạm thời khi người dùng đưa chuột vào vùng sidebar. Người dùng không phải tìm nút mở rộng nhỏ.
- Tên cá nhân, vai trò và tên hợp tác xã là ba khái niệm riêng biệt.
- `Chủ HTX Trung Nam` không được dùng làm tên hiển thị của một cá nhân.
- Tài khoản Owner không được chỉnh sửa hoặc khóa trong SCR-09. Nội dung hiển thị phải là thông báo dành cho người dùng, không chép nguyên ghi chú SRS vào sản phẩm.
- Bỏ nhãn chung chung `Không gian làm việc`.
- Khu vực nhận diện tài khoản cần cho thấy tên người dùng và vai trò ngay trong sidebar hoặc một vị trí có chủ đích tương đương.
- Mọi màn được xây như sản phẩm thật; chữ `foundation` không phải lý do để bỏ qua trạng thái lỗi, tính nhất quán hoặc chất lượng thị giác.

## 3. Finding mức nghiêm trọng cao

### UX-01 — Hồ sơ cá nhân không gắn với tài khoản đang đăng nhập

**Hiện tượng**

Repository hồ sơ cá nhân khởi tạo cố định:

- `accountId = account-owner-demo`;
- `displayName = Chủ HTX Trung Nam`;
- role là `Chủ hợp tác xã`.

Trong khi route `/account` được hiển thị cho mọi tài khoản đã đăng nhập, kể cả Staff.

**Nguyên nhân gốc**

Mock auth và mock personal profile là hai nguồn state độc lập. Profile repository không nhận `accountId` của session và không tra profile theo người dùng hiện tại.

**Ảnh hưởng**

- Staff có thể nhìn thấy dữ liệu mock của Owner.
- Khi Staff lưu tên hiển thị, header có thể đổi nhưng repository profile vẫn đại diện cho một account khác.
- UI tạo cảm giác có rò rỉ dữ liệu chéo tài khoản.

**Phương án xử lý**

1. Bổ sung identity context tối thiểu cho session: `accountId`, tên cá nhân, vai trò hiển thị chính, tên đơn vị và phạm vi ngắn gọn.
2. `PersonalProfileRepository.load()` phải nhận hoặc được khởi tạo theo `accountId` của session.
3. Tạo bộ mock profile theo từng account; không dùng một `defaultProfile` toàn cục cho mọi role.
4. Đồng bộ profile sau save bằng `accountId`, không chỉ truyền một chuỗi display name lên AuthProvider.
5. Thêm test: Owner, Staff và SysAdmin tải đúng profile; không profile nào nhìn thấy dữ liệu của account khác.

**Tiêu chí hoàn thành**

- Đăng nhập `owner` hiển thị một tên người thật và role `Chủ hợp tác xã`.
- Đăng nhập Staff hiển thị tên người thật, role và vùng được cấp tương ứng.
- Refresh hoặc chuyển route không làm profile biến thành Owner mặc định.

### UX-02 — Đang trộn tên người, vai trò, phạm vi và tên HTX

**Hiện tượng**

Các chuỗi hiện tại gồm:

- `Chủ HTX Trung Nam` được dùng làm `displayName`;
- `Nhân viên vùng Đông` được dùng làm `displayName`;
- `Chủ HTX Trung Nam` còn được ghi vào `grantedBy`.

Đây không phải tên người. Chuỗi đầu trộn vai trò với đơn vị; chuỗi thứ hai trộn loại người dùng với phạm vi công việc.

**Nguyên nhân gốc**

`AuthAccount` mới chỉ có `displayName` và `username`. Component buộc phải nhét mọi ngữ cảnh vào một trường duy nhất.

**Phương án xử lý**

Tách rõ mô hình trình bày:

- `displayName`: tên cá nhân, ví dụ `Nguyễn Văn An`;
- `primaryRoleLabel`: `Chủ hợp tác xã`, `Quản lý vùng`, `Kế toán`;
- `organizationName`: `Hợp tác xã nuôi trồng thủy sản Trung Nam`;
- `scopeLabel`: `Toàn hợp tác xã` hoặc `Khu Đông`;
- `username`: định danh đăng nhập bất biến;
- các trường audit như `grantedBy` phải chứa snapshot tên người thực hiện hoặc actor ID, không chứa tên tổ chức giả làm tên người.

Tên mock cụ thể chỉ là dữ liệu phát triển nhưng phải nhất quán một-một giữa auth, profile, account và employee fixtures.

**Tiêu chí hoàn thành**

- Không còn chuỗi `Chủ HTX Trung Nam` hoặc `Nhân viên vùng Đông` trong trường tên cá nhân.
- Sidebar phân biệt được tên người, vai trò và HTX mà không cần suy đoán.

### UX-03 — Logout có thể mắc vô thời hạn

**Hiện tượng**

Kiểm tra trực tiếp với mock latency 450 ms chưa tái hiện lỗi vô hạn: luồng chuyển về `/login` sau khoảng dưới một giây. Tuy nhiên code hiện tại xác nhận rủi ro mà người dùng đã gặp.

**Nguyên nhân gốc**

`performLocalFirstLogout` xóa session local trước nhưng vẫn `await` remote invalidation. Đồng thời `AppSessionShell` cố tình không redirect khi `isLoggingOut = true`. Nếu remote request không bao giờ resolve, giao diện mắc ở trạng thái chuyển trang/đăng xuất.

**Phương án xử lý**

- Xóa session local và protected cache ngay lập tức.
- Điều hướng về `/login` ngay sau khi local cleanup hoàn tất.
- Remote invalidation chạy best-effort và có timeout rõ ràng; lỗi remote không được giữ người dùng trong app shell.
- Chống double-click và không hiển thị lại dữ liệu protected trong lúc điều hướng.
- Ghi test với một promise remote không resolve để chứng minh người dùng vẫn tới `/login`.

**Tiêu chí hoàn thành**

- Logout điều hướng ngay cả khi adapter bị treo.
- Back hoặc truy cập trực tiếp route protected không làm lộ nội dung cũ.
- Không còn trạng thái `Đang đăng xuất...` kéo dài vô hạn.

### UX-04 — Route protected và mock session chưa chịu được reload

**Hiện tượng**

Khi điều hướng trực tiếp/reload các route protected trong lúc audit, app quay về trạng thái kiểm tra session. Mock session chỉ nằm trong memory của module và có thể mất khi full reload.

**Nguyên nhân gốc**

Ứng dụng hiện dùng client auth state cùng in-memory mock; chưa có server session/cookie contract. Đây cũng là lý do request chưa đăng nhập tới route protected vẫn có thể nhận HTTP 200 trước khi client guard chạy.

**Phương án xử lý**

- Ở chế độ mock: tạo mock session adapter riêng, có thể khôi phục một session không chứa token/secret sau reload và được xóa khi logout.
- Ở QA/production: dùng session mechanism đã thống nhất với backend và bảo vệ route ở server boundary.
- Không dùng persistence mock như bằng chứng production security.

**Tiêu chí hoàn thành**

- Reload route không làm người review mất session mock ngoài ý muốn.
- Production route protection được kiểm tra ở server sau khi contract auth được chốt.

## 4. Finding về cấu trúc tương tác

### UX-05 — Form CRUD mở inline làm trang nặng và khó định hướng

**Phạm vi hiện tại**

- `/employees`: danh sách bên trái, `EmployeeEditor` bên phải/phía dưới.
- `/access/accounts`: danh sách bên trái, `AccountEditor` bên phải/phía dưới.
- `/access/roles`: danh sách bên trái, `RoleEditor` bên phải/phía dưới.

Ở màn nhỏ, chọn một card khiến người dùng phải đi tìm form ở phía dưới. Ở desktop, hai cột cạnh tranh chiều rộng; role permission matrix đặc biệt chật.

**Phương án xử lý**

Tạo một modal shell dùng chung cho các editor nhưng không gom nghiệp vụ của ba module vào cùng component:

- card click mở dialog xem/sửa;
- nút thêm mở dialog tạo mới;
- desktop dùng modal rộng, có header và footer sticky;
- mobile dùng dialog gần full-screen;
- đóng dialog trả focus về đúng card/nút đã mở;
- draft đã thay đổi phải cảnh báo trước khi đóng;
- save thành công cập nhật card phía sau và đóng hoặc giữ dialog theo kết quả nghiệp vụ;
- confirmation nhạy cảm vẫn là dialog cấp hai có kiểm soát focus.

Riêng role permission matrix dùng modal kích thước lớn thay vì ép vào modal nhỏ.

**Tiêu chí hoàn thành**

- Người dùng không phải cuộn tìm form sau khi chọn card.
- Dialog không tràn ở 360 px và vẫn thao tác được bằng bàn phím.
- Không mất draft do click backdrop/Escape ngoài ý muốn.

### UX-06 — Sidebar thu gọn có affordance kém

**Hiện tượng**

Sidebar dùng một nút mũi tên nhỏ để thu gọn và một nút khác ở cuối sidebar để mở rộng. Vị trí mở rộng khó thấy, đặc biệt khi danh sách menu dài.

**Phương án xử lý**

- Giữ trạng thái `pinned expanded/collapsed` riêng với trạng thái `temporarily expanded`.
- Khi rail đang thu gọn, `pointerenter` hoặc `focus-within` mở rộng tạm thời.
- Khi pointer rời và focus không còn bên trong, sidebar trở về rail.
- Người dùng bàn phím phải nhận được cùng khả năng mở rộng; không dựa duy nhất vào hover.
- Nút thu gọn/pin chỉ xuất hiện ở trạng thái expanded, không đặt nút mở rộng ở cuối thanh.
- Mobile tiếp tục dùng drawer vì thiết bị cảm ứng không có hover.

**Tiêu chí hoàn thành**

- Hover/focus vào rail thấy đầy đủ label.
- Không rung layout nội dung khi mở tạm thời; sidebar overlay trên content hoặc có chiến lược chuyển động thống nhất.
- `prefers-reduced-motion` không bị ép animation.

### UX-07 — Khu vực nhận diện người dùng thiếu ngữ cảnh

**Hiện tượng**

Top bar hiện chữ `Không gian làm việc` và một link chỉ có display name. Sidebar desktop không trình bày tên người, role và HTX như một khối nhận diện hoàn chỉnh.

**Phương án xử lý**

- Bỏ `Không gian làm việc`.
- Đưa tên HTX vào khu vực workspace context gần logo, vì đây là đơn vị đang được quản lý.
- Đưa avatar initials, tên cá nhân, role chính và phạm vi ngắn vào footer sidebar.
- Khi sidebar thu gọn chỉ hiện avatar; hover/focus mở rail để hiện nội dung đầy đủ.
- Top bar chỉ giữ page context cần thiết và các hành động toàn cục thực sự tồn tại; không lặp lại một account link không có thêm ý nghĩa.
- Đổi nhãn menu `Tài khoản` thành `Hồ sơ cá nhân`. Không cần eyebrow `Tài khoản của tôi` phía trên tiêu đề cùng nghĩa.

## 5. Finding về Dashboard

### UX-08 — Dashboard hiện là trang chào mừng, không phải công cụ vận hành

**Hiện tượng**

Dashboard chỉ có heading, mô tả và banner chào mừng. Không có chỉ số, tình trạng cần chú ý hoặc đường tắt theo vai trò.

**Nguyên nhân gốc**

Foundation trước đây cố tránh bịa metric khi chưa có contract. Cách làm này an toàn về nghiệp vụ nhưng đã dừng ở placeholder quá lâu.

**Phương án xử lý kiến trúc**

Tạo `DashboardRepository`/`DashboardService` trả về một snapshot độc lập với component. UI không tự đếm fixture và không gọi chéo trực tiếp repository của Employee/Account/Role.

Snapshot gồm các widget có kiểu rõ ràng:

- metric có `label`, `value`, `trend/status` nếu nguồn dữ liệu thực sự có;
- attention item có mức độ, mô tả và route hành động;
- quick action chỉ xuất hiện nếu account có permission tương ứng;
- timestamp cho biết dữ liệu được cập nhật khi nào.

**Bộ số liệu đề xuất theo role**

Owner, dựa trên entity hiện đã có:

- tổng nhân viên, đang làm việc, đã nghỉ;
- tài khoản nội bộ đang hoạt động và đã khóa;
- vai trò đang sử dụng;
- khu nuôi đang sử dụng;
- trạng thái hoàn thiện hồ sơ HTX;
- cảnh báo có tài khoản chưa xác minh liên hệ hoặc chưa có grant hiệu lực, nếu backend cung cấp được truy vấn đó.

Staff/Zone Manager/Accountant:

- vai trò hiện tại theo từng vùng;
- số vùng đang được cấp quyền;
- các module được phép truy cập;
- số liệu nghiệp vụ vùng/chấm công/tài chính chỉ thêm khi feature tương ứng có contract thật.

SysAdmin:

- số HTX theo trạng thái Preliminary/Completed/active nếu backend có endpoint tổng hợp;
- các HTX cần hoàn thiện;
- hành động khởi tạo HTX.

Không dùng số ngẫu nhiên. Mock dashboard phải tạo snapshot có nguồn từ mock store hoặc fixture thống nhất.

**Thiết kế thị giác đề xuất**

- Header ngắn: lời chào bằng tên người + role/scope, không dùng banner lớn chiếm diện tích.
- Lưới KPI rõ ràng, icon SVG thống nhất, không dùng emoji `🔒`/`⛔` làm icon sản phẩm.
- Một vùng “Cần chú ý” và một vùng “Truy cập nhanh”.
- Skeleton cho initial load; retry/empty/permission denied có nội dung hữu ích.
- Animation chỉ dùng cho reveal/hover ngắn và tôn trọng reduced motion.

## 6. Finding về câu chữ và quy tắc Owner

### UX-09 — Thông báo tài khoản Owner đang chép ghi chú kỹ thuật vào UI

**Nội dung hiện tại**

`SCR-09 không cho sửa hoặc khóa tài khoản Chủ HTX. Chủ tài khoản tự cập nhật hồ sơ; hỗ trợ truy cập thuộc quy trình quản trị hệ thống riêng.`

**Vấn đề**

- `SCR-09` là mã màn trong tài liệu, không có ý nghĩa với người dùng.
- Câu “hỗ trợ truy cập thuộc quy trình...” là ghi chú phân tích, không phải hướng dẫn hành động.
- Card vẫn đặt trong một editor khiến người dùng tưởng có thể quản trị Owner ở đây.

**Copy đề xuất**

- Tiêu đề: `Tài khoản Chủ hợp tác xã`.
- Nội dung: `Tài khoản này được bảo vệ và không thể chỉnh sửa hoặc khóa tại màn quản lý tài khoản nội bộ.`
- Nếu đó là chính account đang đăng nhập: hành động `Mở hồ sơ cá nhân`.
- Không cung cấp hành động khóa, reset hoặc sửa grant cho Owner trong SCR-09.

Backend vẫn phải từ chối mutation đối với Owner; ẩn nút ở frontend không phải authorization.

### UX-10 — Thuật ngữ chưa nhất quán

Các biến thể đang cùng tồn tại: `Chủ HTX`, `Chủ hợp tác xã`, `Tài khoản`, `Tài khoản của tôi`, `Hồ sơ cá nhân`, `Nhân viên vùng Đông`.

**Phương án**

- Dùng `Chủ hợp tác xã` cho role chính thức.
- Dùng `Hồ sơ cá nhân` cho nơi người dùng tự cập nhật tên/liên hệ.
- Dùng `Tài khoản nội bộ` cho UC11/SCR-09.
- Dùng `Hợp tác xã ...` cho organization/workspace context.
- Dùng tên vùng trong `scopeLabel`, không ghép vào tên người.

## 7. Finding bổ sung qua tự rà soát

### UX-11 — Thiếu metadata cho một số route

Browser hiển thị title chỉ là `OMTS` tại `/employees` và `/access/accounts`, trong khi các route khác đã có title cụ thể.

**Sửa:** thêm metadata nhất quán cho mọi route production và test title cơ bản.

### UX-12 — Mock audit actor đang dùng tên tổ chức/role thay tên người

`grantedBy` đang chứa `Chủ HTX Trung Nam`. Trường này phải là tên người thực hiện tại thời điểm cấp hoặc actor ID được backend resolve.

**Sửa:** mock dùng cùng identity fixture của Owner; production lấy dữ liệu audit từ backend, không tự ghi tên ở component.

### UX-13 — Owner protection mới chủ yếu nằm ở cách render

`AccountEditor` không render action khi `accountType` không phải internal. Tuy nhiên mock repository/service cũng phải từ chối mutation Owner nếu bị gọi trực tiếp hoặc UI có lỗi.

**Sửa:** bổ sung invariant tại repository/service và test trực tiếp các operation save/lock/reset/revoke với Owner account.

### UX-14 — Một số trạng thái dùng emoji và copy kiểu prototype

Dashboard login-required và permission-denied dùng emoji làm icon. Một số heading/eyebrow lặp nghĩa hoặc dài như báo cáo kỹ thuật.

**Sửa:** dùng bộ icon SVG nhất quán, rút gọn hierarchy chữ và đưa giải thích kỹ thuật ra khỏi product UI.

### UX-15 — Navigation chưa phản ánh rõ nhóm chức năng

Menu Owner là một danh sách phẳng gồm hồ sơ HTX, nhân viên, account và role. Khi thêm vùng nuôi, bè, đơn hàng, tài chính, danh sách sẽ khó quét.

**Sửa:** chuẩn bị cấu trúc nhóm có thể mở/đóng: `Vận hành`, `Nhân sự`, `Quản trị truy cập`, `Thiết lập HTX`. Chỉ render nhóm khi có ít nhất một route được cấp quyền. Chưa thêm route chưa tồn tại.

## 8. Thứ tự xử lý đề xuất

### Lát 1 — Sửa nền danh tính và logout

1. Tách person/role/organization/scope trong session presentation model.
2. Đồng bộ fixtures giữa auth, profile, employee và account.
3. Scope personal profile theo current account.
4. Sửa logout để navigation không chờ remote invalidation.
5. Thêm test chống cross-account và hanging logout.

Lát này phải làm trước vì dashboard và sidebar đều phụ thuộc identity đúng.

### Lát 2 — Làm lại application shell

1. Bỏ `Không gian làm việc`.
2. Đưa workspace context và identity block vào sidebar.
3. Hover/focus expand cho collapsed rail.
4. Nhóm navigation nhưng không tạo route mới.
5. Hoàn thiện mobile drawer và reduced-motion behavior.

### Lát 3 — Dashboard có dữ liệu

1. Chốt dashboard snapshot contract phía frontend.
2. Dựng mock adapter từ các nguồn fixture thống nhất.
3. Làm dashboard role-aware với KPI, attention và quick actions.
4. Test Owner, Staff và SysAdmin; không hiển thị widget không có quyền.

### Lát 4 — Chuyển ba editor sang modal

Thực hiện lần lượt để giảm regression:

1. Employee dialog — form ngắn nhất, dùng làm chuẩn dialog CRUD.
2. Account dialog — thêm preview permission và nested confirmations.
3. Role dialog — modal lớn cho permission matrix.

Mỗi module phải hoàn thành keyboard, focus return, dirty-close confirmation, 360 px và regression trước khi sang module tiếp theo.

### Lát 5 — Product copy và polish toàn hệ thống

1. Thay thông báo Owner bằng copy dành cho người dùng.
2. Chuẩn hóa thuật ngữ.
3. Bổ sung route metadata.
4. Thay emoji bằng icon system.
5. Rà loading/empty/error/pending/toast và chuyển động.

## 9. Những điểm cần backend/BA xác nhận trước khi tích hợp thật

Báo cáo này không tự chốt các contract sau:

- payload session trả tên cá nhân, organization và role/scope summary như thế nào;
- dashboard có endpoint aggregate riêng hay từng feature cung cấp summary;
- định nghĩa chính xác `HTX active/completed` nếu SysAdmin dashboard cần số liệu;
- Owner protection được backend biểu diễn bằng account type, immutable flag hay policy code;
- timeout/retry chính thức của logout invalidation;
- các metric vùng nuôi, bè, chấm công, tài chính chưa được đưa vào dashboard trước khi feature/API tương ứng tồn tại.

## 10. Tự đánh giá báo cáo

**Điểm tốt**

- Phân biệt lỗi thị giác với lỗi identity/session có thể gây sai dữ liệu.
- Không biến đề xuất dashboard thành số liệu ngẫu nhiên.
- Tôn trọng quyết định dùng modal nhưng vẫn giữ accessibility và cảnh báo mất draft.
- Có thứ tự sửa để tránh thay shell, dashboard và ba CRUD cùng một lúc.

**Giới hạn**

- Chưa có QA API nên chưa thể kiểm chứng session payload và dashboard aggregate thật.
- Audit trực tiếp xác nhận logout mock hoàn thành trong khoảng dưới một giây; lỗi treo được kết luận từ control flow hiện tại và báo cáo của người dùng, chưa tái hiện được bằng network fault trong UI.
- Chưa thực hiện visual regression tự động; cần kiểm tra lại 360 px, 1024 px và desktop rộng sau từng lát.

## 11. Kết luận

Web hiện có nhiều luồng nghiệp vụ và data boundary hơn những gì dashboard thể hiện, nhưng application shell và identity model vẫn mang dấu vết của một bản foundation/demo. Ưu tiên đúng không phải là trang trí dashboard trước, mà là sửa identity/session, sau đó xây lại shell, dashboard có dữ liệu và cuối cùng chuyển các editor sang modal theo từng module.

## 12. Nhật ký triển khai

### 21/10/2026 — Lát 1: identity, profile và logout

Đã triển khai:

- thêm catalog danh tính mock dùng chung, tách rõ tên cá nhân, vai trò chính, tổ chức và phạm vi;
- đổi Owner từ tên tổ chức `Chủ HTX Trung Nam` sang tên cá nhân `Lê Minh Hải`;
- đổi Staff từ nhãn mô tả `Nhân viên vùng Đông` sang tên cá nhân `Nguyễn Văn An`;
- scope mock profile theo `accountId`; mỗi account nhận một environment profile riêng, account không có fixture không được fallback sang Owner;
- thay audit actor mock từ tên tổ chức sang tên người Owner;
- logout xóa session/cache cục bộ trước, điều hướng về login ngay và giới hạn thời gian chờ remote invalidation ở 1,5 giây;
- thêm test cho remote logout lỗi và remote logout không bao giờ hoàn thành.

Lỗi thực tế đã gặp:

1. `ReferenceError: window is not defined` khi test logout. Nguyên nhân là utility thuần dùng `window.setTimeout` trong môi trường Node. Đã đổi sang timer đa môi trường và hủy timer sau `Promise.race`.
2. Typecheck phát hiện dependency profile singleton cũ còn sót và các nhánh nullable chưa được thu hẹp. Đã truyền service qua props và dùng fixture helper trả về kiểu bắt buộc.
3. ESLint `react-hooks/set-state-in-effect` phát hiện state lỗi được set đồng bộ trong effect. Đã chuyển trường hợp thiếu service thành derived render state.
4. Browser QA tái hiện nút sidebar vẫn giữ `Đang đăng xuất...` sau khi logout Owner rồi đăng nhập Staff. App Router có thể tái sử dụng shell, trong khi `isLoggingOut` chỉ được đặt `true` và không có nhánh hoàn tất. Đã reset state trong `finally`; navigation vẫn diễn ra ngay và không chờ remote request.

Bằng chứng tại thời điểm ghi nhật ký:

- auth/profile tests: 50/50 pass;
- toàn bộ unit tests: 246/246 pass;
- TypeScript typecheck: pass;
- lint và production build: pass;
- browser QA: Owner hiển thị `Lê Minh Hải`; Staff hiển thị `Nguyễn Văn An`; profile Owner tải đúng account; logout Staff rồi login Owner trả nút về `Đăng xuất`;
- Next.js dev-only `instant-unrendered-segment` tại `/account` vẫn là blocker session/server-guard đã biết. Không tắt cảnh báo hoặc đổi cache/session contract trong lát UI này.

### 21/10/2026 — Lát 2.1: identity block và sidebar tự mở

Đã triển khai phần đầu của application shell:

- bỏ nhãn chung chung `Không gian làm việc` khỏi header;
- hiển thị tên HTX như ngữ cảnh tổ chức, tách khỏi tên cá nhân;
- bổ sung identity block trong sidebar với tên người, vai trò và phạm vi;
- khi sidebar được ghim thu gọn, pointer hover hoặc keyboard focus sẽ mở tạm thời;
- khi rời pointer/focus, sidebar trở lại trạng thái ghim;
- bỏ nút mở rộng nhỏ ở đáy sidebar; mobile drawer vẫn dùng nút Menu vì không có hover.

Chưa làm trong lát này: nhóm navigation, dashboard số liệu và CRUD modal. Các phần đó vẫn theo thứ tự ở mục 8.

> Ghi chú 22/10/2026: cơ chế sidebar tự mở của lát 2.1 đã được thay thế hoàn toàn ở lát 2.2 bằng sidebar desktop cố định sau khi review trực tiếp cho thấy chuyển động chiều rộng vẫn gây nhảy và khó dự đoán.

### 22/10/2026 — Lát 2.2–4: thay application shell, dashboard và editor chính

Đã triển khai:

- loại bỏ hoàn toàn cơ chế sidebar ghim thu gọn rồi tự mở theo hover/focus; desktop dùng sidebar cố định để hit-area và vị trí menu không thay đổi dưới con trỏ;
- bỏ top bar desktop đang lặp tên HTX, phạm vi, tên người và vai trò; danh tính chỉ còn một lần ở cuối sidebar;
- nhóm điều hướng thành `Điều hành`, `Nhân sự & phân quyền`, `Hệ thống`; nhóm rỗng không được render khi account thiếu quyền;
- giữ mobile app bar tối giản và drawer có đủ menu, danh tính, vai trò/phạm vi và đăng xuất;
- thay dashboard chào mừng bằng bốn KPI lấy từ mock repository hiện có, biểu đồ cơ cấu nhân sự và trạng thái chưa có dữ liệu cho thu, chi, bè nuôi, sản lượng;
- không hard-code số tài chính/sản lượng; dashboard service lọc nhóm số liệu quản lý theo effective permission trước khi component render;
- chuyển editor nhân viên và vai trò/quyền từ cột bên phải sang dialog; danh sách dùng toàn bộ chiều rộng và giữ nguyên service, validation, conflict/impact confirmation;
- mở rộng dialog primitive với kích thước `md`, `lg`, `xl`; dialog dài cuộn bên trong và chiếm toàn màn hình ở mobile;
- thiết kế lại `/account` thành trung tâm hồ sơ và bảo mật; tên, username, role và scope có hierarchy rõ, đổi mật khẩu mở dialog riêng dùng service/repository account-security;
- đổi browser title `/dashboard` từ `Tổng quan` sang `Bảng điều hành`.

QA trực tiếp:

- Owner hiển thị đúng `Lê Minh Hải · Chủ hợp tác xã · Toàn hợp tác xã` trong sidebar, không có top bar lặp thông tin;
- click `Nguyễn Văn An` mở dialog hồ sơ nhân viên, focus ban đầu vào nút đóng, form có đầy đủ nhận diện, liên kết account và thông tin bổ sung;
- click `Quản lý vùng` mở dialog ma trận quyền, vẫn giữ impact confirmation và thao tác ngừng sử dụng;
- `/account` mở được dialog đổi mật khẩu với current/new/confirm, checklist chính sách và visibility toggle;
- mobile drawer mở bằng nút `Menu`, giữ đúng permission-filtered navigation và không tràn ngang từ chiều rộng nội dung 320 px;
- không submit đổi mật khẩu trong browser QA để không thay credential của phiên review; repository/schema/form được kiểm bằng unit test.

Lỗi/công cụ thực tế trong QA:

1. Lần đầu tìm login field bằng exact accessible label không khớp vì label DOM chứa thêm dấu bắt buộc và hint. Đã kiểm tra DOM snapshot và dùng locator theo role/name của textbox; đây là lỗi locator QA, không phải lỗi form.
2. Gọi `goto('/employees')` tạo full document navigation, làm mất mock session chỉ lưu trong React memory và bị redirect về `/login`. Đã kiểm lại qua URL/AX tree, đăng nhập rồi chuyển route bằng link App Router. Đây đồng thời là bằng chứng session mock chưa bền qua reload và không thay thế server session.
3. Công cụ viewport desktop timeout nhưng phép đổi viewport thực tế đã được áp dụng. Không lặp click/resize mù; đã bind lại tab, đọc AX tree và screenshot để xác nhận sidebar desktop.
4. Lần đo mobile đầu tiên có `innerWidth=277` trong side panel, nhỏ hơn `html min-width=320px`, nên browser test host xuất hiện horizontal scroll. Đã đo `innerWidth/documentScrollWidth`, điều chỉnh viewport để phần nội dung lớn hơn 320 px và xác nhận dialog không còn overflow. Đây là giới hạn khung IAB, không phải regression ở breakpoint 360 px.

Bằng chứng kỹ thuật sau sửa:

- lint: pass;
- TypeScript typecheck: pass;
- 54 test files, 248/248 tests: pass;
- production build: pass, 13/13 static pages generated;
- `git diff --check`: pass.

Phần chưa thực hiện trong đợt này:

- dirty-close confirmation cho draft trong dialog chưa có contract chung giữa các editor, cần làm thành một micro-task riêng thay vì thêm cảnh báo không nhất quán;
- thu/chi, bè và sản lượng chỉ có trạng thái `Chưa có dữ liệu` cho tới khi feature và API tương ứng cung cấp dữ liệu thật;
- account-security mock dùng mật khẩu review `demo123` theo từng `accountId`, nhưng đổi mật khẩu chưa đồng bộ ngược vào mock auth repository. Không được coi đây là contract tích hợp QA.

### 22/10/2026 — Lát 2.3: auto-reveal rail, Account dialog và motion polish

Đã triển khai:

- thay sidebar desktop cố định rộng bằng rail `80px`; pointer hover hoặc keyboard focus mở rail thành overlay `288px`;
- giữ vùng nội dung ở offset `80px` trong cả hai trạng thái, vì vậy sidebar không đẩy nội dung và icon không đổi vị trí khi mở;
- ẩn/hiện label, nhóm điều hướng, nhận diện người dùng và tên thương hiệu bằng opacity transition; `prefers-reduced-motion` vẫn tắt transition;
- giữ mobile drawer độc lập vì thiết bị cảm ứng không có hover ổn định;
- chuyển `/access/accounts` từ editor bên cạnh thành danh sách card toàn chiều rộng và dialog lớn cho tạo/xem/sửa;
- giữ nguyên service, validation, zone–role grants, preview quyền, nested confirmation và secret-free delivery receipt;
- sửa nội dung tài khoản Owner: không còn hiển thị mã kỹ thuật `SCR-09`, không có action khóa hoặc đặt lại mật khẩu, và chỉ dẫn đúng nơi tự cập nhật hồ sơ;
- thêm hiệu ứng dialog đi vào bằng opacity, dịch chuyển ngắn và scale nhẹ; card nhân viên, tài khoản và vai trò có hover lift nhỏ, không chạy khi người dùng yêu cầu giảm chuyển động.

QA trực tiếp:

- trạng thái thu gọn đo được sidebar `80px`, `mainLeft = 80px`;
- khi sidebar mở xong đo được sidebar `288px`, `mainLeft` vẫn là `80px`, chứng minh không có layout shift;
- chữ thương hiệu không còn bị cắt ló ra ngoài rail khi thu gọn;
- click `Nguyễn Văn An` ở `/access/accounts` mở dialog có thông tin tài khoản, grants, reset và lock;
- click `Lê Minh Hải` mở dialog chỉ đọc, chỉ còn nút đóng, không render lock/reset;
- không submit các action lock/reset/revoke trong browser QA để không thay state review ngoài phạm vi kiểm tra trình bày.

Lỗi thực tế đã gặp:

1. Locator QA tìm nút đóng theo ký tự `×` nhưng component dùng accessible name `Đóng hộp thoại`. Playwright báo không tìm thấy phần tử dù nút vẫn hiện. Đọc lại accessibility tree cho thấy tên đúng; locator được đổi sang accessible name. Đây là lỗi kịch bản QA, không phải lỗi UI.
2. Sau một thay đổi CSS nhỏ, dialog đang mở trong dev browser vẫn giữ class cũ do instance HMR hiện hành chưa được thay thế. Không kết luận từ ảnh cũ; source, lint, typecheck và production build được dùng làm bằng chứng code, còn các hành vi chính được kiểm trước/sau bằng DOM measurement và accessibility tree.

Bằng chứng kỹ thuật sau sửa:

- lint: pass, không warning;
- TypeScript typecheck: pass;
- 54 test files, 248/248 tests: pass;
- production build: pass, 13/13 static pages generated;
- `git diff --check`: pass.

Phần còn lại:

- dirty-close confirmation vẫn cần một contract dùng chung cho Employee, Role và Account dialog;
- motion hiện là CSS transition/animation có reduced-motion fallback, chưa có visual-regression test tự động;
- session mock vẫn chỉ nằm trong React memory; reload trực tiếp route protected không đại diện cho session thật của QA API.

### 22/10/2026 — Lát 4.1: nhận diện vai trò–vùng trong danh sách tài khoản

Đã triển khai:

- card tài khoản nội bộ hiển thị từng cặp `vai trò · vùng` từ grant đang hiệu lực;
- không thêm trường `chức vụ` toàn cục vì một Staff có thể giữ vai trò khác nhau theo từng vùng;
- tìm kiếm mở rộng sang tên vai trò và tên vùng;
- thêm bộ lọc `Vùng phụ trách` và `Vai trò đảm nhiệm` cạnh ô tìm kiếm;
- grant `Tất cả vùng` được coi là áp dụng khi lọc từng vùng cụ thể; lựa chọn `Được phân công toàn HTX` chỉ tìm grant có `zoneId = null`;
- Owner hiển thị `Chủ hợp tác xã · Toàn HTX`; tài khoản nội bộ không có grant hiệu lực hiển thị `Chưa được phân quyền`;
- nút `Xóa bộ lọc` chỉ xuất hiện khi có query hoặc filter đang hoạt động.

QA trực tiếp:

- accessibility tree nhận đủ searchbox, hai combobox và role–zone badge trên từng card;
- lọc `Khu Đông + Quản lý vùng` trả đúng một tài khoản `Nguyễn Văn An`;
- reset filter trả danh sách về bốn tài khoản;
- test thuần xác nhận grant đã thu hồi không được dùng làm vai trò hiện tại và grant toàn vùng khớp với từng vùng.
