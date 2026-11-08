# Hoàn thiện kiểm tra thông tin cá nhân nhân viên

> Review trước xuất bản: [báo cáo tổng thể](WEB_EMPLOYEE_PERSONAL_ACCOUNT_FULL_REVIEW_2026-10-28.md) tìm và sửa P2 validation-save về muộn sau unmount/mở unlink, thêm3 test. Các kết quả2.217 và trạng thái local bên dưới là snapshot trước review; nguồn kiểm cuối và phạm vi commit xem báo cáo mới. API/refresh/MSG06/tên MSG24 giữ nguyên.

> Cập nhật sau báo cáo: Duy Thái đã chốt WEB-EMP-ACCOUNT-01, lưu employee trước rồi tạo account từ profile. Trạng thái “đang hỏi” bên dưới là snapshot lúc hoàn thành personal validation; [lát tạo account tiếp theo](WEB_EMPLOYEE_ACCOUNT_CREATION_2026-10-28.md) thực hiện quyết định mới bằng mock, không bật API.

Ngày 28/10/2026, Asia/Saigon. Web tiếp tục trên `feature/OMTS-132-web-foundation`, nền `d1bcca514c24b5aca912cc305093e3cdf7734a2b`. Lượt này làm EMP-PERSON-01…04 bằng mock, không bật API/refresh, không đổi MSG06/tên MSG24 hoặc xử lý incident GitGuardian.

## Backend đã pull và đối chiếu

Repo `D:/Đồ_án/omts-backend` sạch, nhánh develop. `git pull --ff-only origin develop` thành công với **Already up to date**; HEAD vẫn `953f5977f880d5ea7916d6e91482a0d0a5b2a95a`. Không có diff so với lần audit trước, không cập nhật DB/migration/seed hoặc runtime backend-local.

Đã kiểm danh sách PR mở: [PR13 LAB](https://github.com/thaideptrai218/omts-backend/pull/13), head c92787b, và [PR10 SDS](https://github.com/thaideptrai218/omts-backend/pull/10), head39ec292. Cả hai chưa merge, nên không lấy làm contract develop hoặc chứng cứ endpoint đã phát hành. Không checkout/merge các nhánh này.

Đọc lại OMTS-203, dependency199 và parent119. Đối chiếu EmployeeInput.cs, Common/Validation/PhoneNumbers.cs và EmployeeDtos/EmployeeService tại953f597. Các giới hạn/thành phần cá nhân bên dưới đã có trong ticket/backend; không tự thêm độ tuổi tối thiểu hoặc bắt buộc thông tin tùy chọn.

## Các micro-task

**EMP-PERSON-01 — Schema dùng chung.** Thông tin cá nhân trước đây chỉ kiểm tên/SĐT không rỗng; ngày sinh và các ô bổ sung còn nhận chuỗi bất kỳ. Tách personal schema, hằng giới hạn và hàm chuẩn hóa SĐT độc lập framework. Form/editor và mock dùng cùng factory; callback clock được đọc tại thời điểm validate. Validator request API tái sử dụng helper SĐT nhưng vẫn giữ nguyên chuỗi payload đã nhập, không thêm endpoint hoặc gọi mạng.

| Trường | Quy tắc theo ticket/backend |
| --- | --- |
| Họ và tên | Bắt buộc, trim, tối đa100 ký tự |
| SĐT | Định dạng backend: số0 đầu/10 chữ số; hỗ trợ +84/84 và dấu phân cách; mock lưu dạng0 đầu |
| Ngày sinh | Được trống; nếu có phải date-only hợp lệ và không sau ngày nghiệp vụ UTC+7 |
| Địa chỉ | Tùy chọn, trim, tối đa500 |
| Khu vực, Phường/Xã | Tùy chọn, trim, tối đa100 |
| Thông tin khác, Ghi chú | Tùy chọn, trim, tối đa1000 |

Độ dài dùng string.length như contract/team default hiện hành (UTF-16 code units), không thêm một quy tắc đếm grapheme khác. Không normalize dấu tiếng Việt hoặc gộp các khoảng trắng bên trong tên/nội dung.

**EMP-PERSON-02 — Repository.** Mock nhận clock đã inject; lỗi optional field được trả đúng target thay vì quy về Họ và tên. Khi nhiều field lỗi, giữ toàn bộ danh sách bindable. Giữ legacy result cho lỗi identity đơn giản để không đổi các consumer cũ. Số điện thoại được chuẩn hóa khi ghi và khi so trùng fullName+phone; số+84 của cùng người không tạo hồ sơ mới. Lỗi không đổi employee/version/account hoặc quyền.

**EMP-PERSON-03 — Form.** Thêm hướng dẫn giới hạn/SĐT/ngày sinh gắn qua aria-describedby; khi lỗi có cả hint lẫn error ID. Birthday có max ngày Việt Nam, validation vẫn kiểm lại theo clock. Form dùng noValidate để lỗi tiếng Việt đi qua schema thay vì bị native validation chặn trước submit. Không dùng maxlength cắt hoặc chặn việc nhập dài: giữ nguyên nội dung quá giới hạn để người dùng tự sửa. Schema chặn lưu và focus đúng ô. Không đổi thứ tự luồng trạng thái hay chính sách bản nháp đã chốt.

**EMP-PERSON-04 — Test và tự review.** Thêm31 ca schema,16 ca mock và10 ca UI, tổng **57 ca mới**. Test schema có giới hạn trim/over, ngày nhuận/ngày sai/tương lai/mốc nửa đêm UTC+7, định dạng SĐT hợp lệ/không hợp lệ. Repository kiểm không ghi khi lỗi, target nhiều field, chuẩn hóa/create/reload, trùng alias và update chính người đó. UI kiểm hint/ARIA/focus, dữ liệu dài không bị cắt, sửa ngày lỗi thành trống rồi lưu, số điện thoại và account được giữ đúng. Không gọi test mock là nghiệm thu .NET/QA.

## Lỗi thực tế và cách khắc phục

1. `npm test -- .../employee-editor-schema.test.ts` trước sửa: **26 fail/9 pass**, log `employee-personal-schema-red.log`. Lỗi chỉ ra schema cũ nhận giá trị vượt độ dài/ngày sinh sai/SĐT sai hoặc chưa trim ô tùy chọn. Bổ sung schema theo contract, không hạ assertion để làm test xanh.
2. Lượt ghép đầu làm4 test mapper lỗi: expected phoneNumber dạng người dùng nhập, actual dạng0 đầu. Nguyên nhân đưa transform SĐT vào schema editor mà mapper cũng sử dụng. Sửa bằng cách schema chỉ validate/trim, mock normalize lúc ghi; request API vẫn giữ dạng nhập như trước. Schema + mapper sau sửa đạt **57/57**. Log GREEN thay thế lượt thử ghép đầu; không ghi rằng đã lưu một log RED mapper riêng.
3. Test UI mới có **4 fail/6 pass** do getByLabelText với tên chính xác không khớp label chứa dấu * bắt buộc. Không có lỗi mất label của sản phẩm: accessible name bỏ phần aria-hidden. Chuyển truy vấn textbox sang getByRole theo accessible name; date vẫn dùng label. Kết quả **10/10** đạt; không sửa markup để che lỗi query test. Log `employee-personal-new-ui.log` và `employee-personal-new-ui-green.log` giữ cả hai lượt.
4. Test server-error cũ giả sử aria-describedby có một ID. Nay hint+error có hai ID hợp lệ; test đã tách danh sách và kiểm mọi node tồn tại, đồng thời vẫn kiểm nội dung lỗi. Cả hai file UI cũ **55/55** đạt.

Log/ảnh giữ local trong `.hallmark/`. Có lỗi đọc sai đường dẫn trong audit (AGENTS.md backend không có; DTO .NET/PhoneNumbers ở repo hoặc thư mục khác; tài liệu learning không có trong snapshot) và một lệnh dùng cú pháp brace expansion Bash trên PowerShell gây ParserError. Đã dùng rg --files tìm nguồn thật và chạy đúng repo; các lỗi đọc không làm pull thất bại, không chữa bằng tạo file/package giả. Chi tiết giải thích trong bài117 local.

## Kiểm source cuối

Source tách ở `D:/Đồ_án/.omts-web-review-20261028` trên nền d1bcca5 cộng12 file liên quan. Đối chiếu hash12/12 file trùng với source chính. Không lấy các thay đổi hồ sơ/thông báo/Dialog dùng chung từ trước. Kiểm nặng chạy tuần tự, không chạy build/test cùng lúc.

| Kiểm tra cuối | Kết quả |
| --- | --- |
| Lint/typecheck | Đạt |
| Full Vitest | **2.217 pass/31 Redis skip**,178 file pass/4 skip;115,09 giây |
| Build | Đạt18/18 trang |
| HTTP built-product | Đạt24 assertions |
| Hallmark static trên EmployeeEditorField | 0 FAIL/0 REFLEX/0 WARN,1 file được nhận diện |

Log cuối ở snapshot `.hallmark/personal-final-{lint,types,tests,build,http}.log`. Redis skip không phải nghiệm thu Redis thật; static không chứng minh layout. Không thêm dependency, route hoặc sửa workflow/config.

## Browser và tự review

Kiểm production mock tại `http://127.0.0.1:3105/employees`, đăng nhập Owner và mở Nguyễn Văn An. Ở1024 px: document rộng1009, dialog751/751 client/scroll; hint hiển thị đủ và không tràn ngang. Nhập ngày sinh29/10/2026 trong ngày nghiệp vụ28/10, giữ ghi chú đang sửa rồi submit: lỗi tiếng Việt hiện đúng ô và focus về phần ngày. Sửa lại ngày hợp lệ, nhập SĐT dạng+84 rồi lưu: editor đóng, danh sách vẫn hiện số0 đầu và account hoạt động; mở lại thấy ghi chú vừa lưu và ngày sinh đúng. Không đổi trạng thái lao động/quyền.

Ở360 px: document345, dialog328/328; nhập ngày tương lai bằng bàn phím rồi submit, input birthday có aria-invalid=true và cả birthday-hint/birthday-error trong aria-describedby. Không có tràn ngang. Hủy thay đổi trả ngày về bản đã lưu và Lưu thay đổi disabled. Đã reset viewport sau kiểm. Ảnh local `.hallmark/employee-personal-1024.png`, `employee-personal-error-1024.png`, `employee-personal-error-360.png`.

Có hai điểm thao tác tự động cần phân biệt với lỗi ứng dụng: lượt điền đăng nhập đầu không khớp fixture, điền thay thế đầy đủ mới thành công (không log nội dung mật khẩu); getByLabel exact ở mật khẩu không khớp label có dấu*. Với input date, fill một mình đổi DOM value nhưng chưa làm dirty nên cú click Lưu bị từ chối vì nút disabled; phím Up thực làm form dirty và kiểm lỗi thành công. Không kết luận nguyên nhân event của công cụ khi chưa có bằng chứng; không dùng force-click/JS dispatch hoặc sửa auth/form để né kiểm. Một phép đo đầu lấy nhầm input date trong dialog con đang đóng; đã đo lại bằng label Ngày sinh trên input thật, các giá trị aria-invalid=true ở trên là lần kiểm sau cùng.

Tự review chưa thấy lỗi mới còn mở trong phạm vi personal validation đã kiểm. Các lỗi thử ghép mapper/query test đã được xử lý và giữ assertion về dữ liệu/ARIA. Không báo đã hoàn tất toàn bộ LAB-01, API/QA, tạo account inline hoặc audit bền vững. Preview3105 dùng snapshot mới; server3000 của người dùng không bị stop hoặc rebuild.

## Phần còn chờ và quyết định chưa chốt

Account inline còn khác quyết định đã chốt: backend/ticket đòi username nhập và trả mật khẩu tạm; frontend đã chọn username tự sinh, Owner không xem mật khẩu. Đã hỏi người dùng riêng về đề xuất lưu employee trước rồi tạo account từ profile, thay vì cùng transaction/lần lưu trong ticket. Chưa có câu trả lời thì chỉ là đề xuất; không tự ghép employee/account bằng hai mutation rồi coi atomic hoặc tự chọn role từ vùng làm việc.

API/refresh, MSG06 và tên MSG24 giữ chờ. Chưa tạo endpoint, sửa BFF/session/cookie/guard/cache, SRS hoặc Jira. Không làm các chức năng lao động từ PR13 khi chúng chưa merge. Các thay đổi mới đang local; chưa commit/push/merge trong lượt này. Bài117 giữ ignore.
