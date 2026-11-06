# W1.3/W1.4 — Hồ sơ nullable và permission projection

Ngày 24/10/2026, Asia/Saigon. Thực thi trên `feature/OMTS-132-web-foundation`, giữ nguyên các thay đổi chưa commit của phiên trước. Không tạo nhánh, không commit/push/merge, không sửa backend/Mobile/SRS/Jira.

## 1. Kết luận

W1.3 đã có profile DTO → domain mapper, contact nullable xuyên qua mock và component, cùng test render. W1.4 đã có permission projection thuần theo snapshot backend: function/action/scope/dataScope được giữ riêng, navigation capability không được dùng thay quyền đọc dữ liệu. Hai bước hoàn thành phần adapter/test độc lập trong plan, **chưa tích hợp API vào ứng dụng** và chưa có xác nhận BA cho catalog production.

MSG06 tiếp tục chờ backend structured `user_name`/`time` theo WEB-API-05. Không thêm câu dự phòng, không thay conflict policy hoặc tự tải lại/ghi đè form.

## 2. Nguồn đã đối chiếu

- Context, AGENTS, plan W1.3/W1.4, schemas W1.1, profile domain/component/mock và helper permission hiện tại.
- Backend local clean và remote `develop` cùng SHA `48ae1e0438cec5d1123e7f7f6726377242855ce5` tại lần kiểm tra. Đọc ProfileService/ViewAsync, AccountAccess/DescribeFunctions, PermissionFunctions, RequireCooperativeOwner và các controller accounts/roles/employees/cooperative profile. Không fetch/checkout/reset hoặc sửa repo backend.
- Report 3 UC05, BR-19: contact verified trước khi thay, role/username read-only trong profile; quyền hợp từ zone-role và catalog hệ thống. Không tự dùng report cũ làm nguồn actor/quyền mới.
- Jira đọc lại: OMTS-132 Done, parent OMTS-121 In Progress; OMTS-123 Function catalog/default matrix vẫn To Do, có yêu cầu làm rõ Data scope. OMTS-171 tiếp tục trả404; không suy ra đã xóa hoặc hoàn thành.
- Tài liệu Next cài tại repo về Server/Client Components được tham khảo trước sửa component. Không gọi Figma vì đây không phải dựng màn theo frame.

## 3. W1.3 theo từng micro-task

### W1.3a — Domain và nullable propagation

`PersonalProfile.phone` đổi thành `ProfileContact | null`, giống email. `ProfileRoleSummary` thêm zoneId tùy chọn để giữ liên hệ với scope được trả về; đây là thông tin hiển thị, không phải access grant dùng cấp quyền.

Mock clone giữ null thay vì spread thành object rỗng; kiểm tra identifier cũ không dereference phone null. Tải/lưu tên không tự tạo contact. Thêm số đầu tiên vẫn phải qua verification; chưa nhận contact mới chỉ vì đã gửi OTP. Không đổi quy tắc Customer/order hoặc quy trình Save đang dùng mock.

### W1.3b — Mapper và account binding

`src/features/profile/api/map-profile-response.ts` nhận unknown + accountId kỳ vọng, parse schema trước rồi kiểm tra identity. GUID khác account bị từ chối; khác casing nhưng cùng GUID được nhận. Kết quả lỗi không chứa partial profile hoặc raw response.

Mapper giữ displayName Unicode, username, contact value/verified flags và opaque rowVersion → recordVersion. Null được giữ null; chuỗi contact rỗng hoặc verified=true nhưng contact=null bị coi là dữ liệu mâu thuẫn, không tự sửa. Không áp parser điện thoại/email mới hoặc đổi validation form.

Grant labels giữ nguyên tên role cấu hình. All-zones hiển thị “Toàn bộ vùng nuôi”; vùng có ID nhưng chưa có tên hiển thị “Vùng chưa có tên”, không bịa tên vùng. Mâu thuẫn allZones/zoneId bị từ chối. Grant rỗng cho roles rỗng; không tự thêm chức danh Owner/Manager hoặc quyền dựa trên role label.

### W1.3c — Presentation và tests

`describeProfileContact` tách ba trạng thái: chưa có contact, có nhưng chưa xác minh, đã xác minh. ProfileEditor dùng optional access cho phone và nhãn “Thêm” khi chưa có; badge không gọi contact thiếu là đã verified. ProfileOverview không thêm dấu phân cách thừa khi roles rỗng, có empty text đúng nghĩa “Không có vai trò theo vùng”.

Có unit tests cho mapper/presentation/mock và hai test `renderToStaticMarkup` chạy chính ProfileEditor với provider thật. Test render không cần thêm dependency/route showcase, xác nhận null không crash và contact chưa verified vẫn hiện đúng. Đây là component-render test, không phải browser interaction/responsive hay Next authorization E2E.

## 4. W1.4 theo từng micro-task

### W1.4a — Catalog snapshot, không tự gán default role

`backend-function-catalog.ts` ghi 26 function của PermissionFunctions tại SHA48ae1e0, supported actions, cooperative-wide và dashboard-tile flag. Enum action dùng chung cho domain/schema để tránh hai danh sách bị lệch. Không tạo role Employee hay default matrix từ suy đoán; OMTS-123 chưa được chốt.

Function chưa biết bị bỏ khỏi projection, không suy ra quyền gần giống theo tên. Action/dataScope enum lạ khiến mapping bị từ chối; action đúng enum nhưng không được function hỗ trợ thì không được cấp. Unknown function `__proto__`/`constructor` không đi qua prototype của lookup table.

### W1.4b — Identity, gates và scope riêng từng action

`map-permissions-response.ts` là entry point: parse unknown, kiểm tra account, Owner flag/subjectType, grant scope consistency, summary scope và duplicate functions. Không trả partial projection khi dữ liệu mâu thuẫn. Password/phone gate còn bật thì trả gated trước khi project capability, kể cả Owner; không giải quyết khác biệt OR-contact bằng cách bỏ gate.

Staff permissions lấy từ mỗi grant và action được phép, giao với action/scope được summary quảng bá, đồng thời giới hạn bởi catalog snapshot. Summary không được dùng một mình để cấp quyền. Đặc biệt, scope gộp allZones của function không được biến Edit vùng A thành Edit tất cả vùng chỉ vì View được cấp toàn vùng.

`merge-function-permissions.ts` chỉ hợp scope khi cùng **function + action + dataScope**. All-zones chỉ thắng zone list trong cùng nhóm đó. OwnRecords và AssignedZone luôn tách, không đổi OwnRecords thành “mọi bản ghi trong vùng”. Chưa định nghĩa ai là owner của từng entity; BA/backend phải làm rõ trước khi feature dùng predicate bản ghi.

Function cooperative-wide như PAYROLL đòi all-zones grant và summary phù hợp; grant một vùng không tự mở quyền dữ liệu toàn HTX. Với function không cooperative-wide, grant một vùng giữ scope vùng đó, không nâng thành global.

### W1.4c — Mapping capability hiện có

| Capability Web | Nguồn trong snapshot | Giới hạn |
| --- | --- | --- |
| access.accounts.manage | IsCooperativeOwner + subjectType nhất quán; AccountsController Owner-only | Không map từ tên role Staff |
| access.roles.manage | Cùng Owner check; RolesController Owner-only | Role tên “Chủ HTX” không đủ |
| cooperative.employees.manage | Owner check; EmployeesController | Không suy từ function LAB chung |
| cooperative.profile.manage | Owner check; CooperativeProfileController | Không tự cấp Staff read-only |
| workspace.overview.view | Có View của dashboard tile đã project; scope hợp cho **hiển thị trang** | Mỗi tile/data vẫn cần function/action/dataScope; không mở toàn bộ KPI |
| platform.cooperative.provision | Chưa có binding được xác nhận trong payload/catalog này | Để unmapped, không tự suy từ SysAdmin; mock menu chưa đổi |

Owner function projection dùng các action known/supported trong summary với all-zones, dựa trên backend Owner có quyền nghiệp vụ toàn HTX; bốn capability quản trị dựa trên Owner-only filters, không phải grant label. Trader/SystemAdministrator không được suy quyền nghiệp vụ từ các grant của Staff. Các endpoint dành riêng cho họ cần adapter/capability binding riêng, không tự lấp bằng mock hoặc quyền global.

### W1.4d — Self-review helper và regression tests

Helper `hasEffectivePermission` trước dùng `.find`, nên bỏ qua grant thứ hai nếu grant đầu khác vùng; nó cũng trả true cho scope zones rỗng khi không có zoneId. Phát hiện từ đọc control flow, đã đổi sang `.some` và từ chối scope rỗng; test hồi quy xác nhận union vùng đúng, vùng ngoài phạm vi/zone rỗng bị từ chối. Không coi đây là server authorization đã hoàn thiện.

Self-review bổ sung giao scope summary × grant để payload không nhất quán không làm rộng quyền; thêm tests cho scope khác nhau giữa functions, actions, dataScopes, nhiều role/case GUID, cooperative-wide, unknown action/function, fake role names và Owner gate. Không dùng code role để quyết định Manager/Accountant.

## 5. Verification

Baseline W0–W1:62 files/340 tests. Sau W1.3:65 files/363 tests. Sau mapper và render tests:69 files/397 tests; sau bổ sung self-review cases: **69 files/401 tests**, thêm61 tests so với baseline. Bốn test files W1.3 và ba test files W1.4 mới; helper permission hiện có thêm regression cases.

Lượt cuối đã chạy lại test401/401, lint, build16.4.3 và typecheck riêng sau build, tất cả exit0. Audit0 findings trong cùng task, không có dependency thay đổi sau đó. `git diff --check` và link tài liệu đã kiểm tra lại thành công; learning notes ignored. Không chạy API login/profile mutation/refresh/logout thật; không có account QA mới, không sửa credentials. Không cập nhật Jira Done theo số test.

Không thêm package hoặc đổi dependency trong lát này. Không tự restart dev server đang mở từ trước. Tests render không chứng minh old dev process đã nạp code/package mới hoặc UI đạt360/1024 trong browser. Khi ghép API cần browser pass riêng.

## 6. Lỗi thực tế và giới hạn tự đánh giá

Không có lỗi build/typecheck/test ứng dụng ở các lượt đã chạy. Có lỗi tra cứu: đọc `src/features/navigation` không tồn tại, đoán nhầm test ở repository thay vì environment/service, và một lệnh dùng path backend trong workdir Web. Đã dùng `rg --files`/đổi đúng workdir để tìm/đọc source thật; không tạo file trùng. `rg` không còn match `.phone.` unsafe trong feature sau sửa trả exit1 là kết quả không có match, không phải test fail.

Lệnh kiểm tra Markdown links ban đầu dùng `Join-Path (Split-Path $docPath) $target` gặp “Cannot bind argument ... Path ... empty string” khi tới README.md ở gốc. PowerShell báo lỗi không kết thúc nên biến đường dẫn cũ có thể còn giá trị và lệnh vẫn in PASS: không chấp nhận kết quả đó. Đã bổ sung base `.` khi parent rỗng và `-ErrorAction Stop`/throw để dừng khi lỗi; chạy lại tất cả link gồm README trả exit0 với “Document links including root README: PASS”. Đây là sửa lệnh diagnostic, không thay code sản phẩm.

W1.3/W1.4 hoàn thành phần adapter snapshot/test; chưa chứng minh backend deploy QA dùng cùng SHA hoặc catalog BA đã được duyệt. Scope OwnRecords cần xác nhận theo entity trước record-level checks. Platform capability chưa có binding và menu/KPI thật chưa nối projection. BFF store/server guard/CSRF/caching/session generation vẫn chưa triển khai, không được đánh production-ready.

MSG06 giữ nguyên trạng thái chờ backend theo WEB-API-05. W2 còn cần chốt store/deployment; refresh-Web và phạm vi hồ sơ API đầu vẫn là quyết định riêng chưa được chốt thêm trong task này. Có thể review/chuẩn bị thiết kế W2 nhưng không tự chọn storage hoặc bật live API để vượt dependency.
