# Yêu cầu mua theo lồng và Workforce trên Web — 31/10/2026

Người dùng đã duyệt [đơn vị và phạm vi Web](../decisions/WEB_SALES_WORKFORCE_SCOPE_2026-10-31.md). Báo cáo này tiếp nối và thay trạng thái chờ của [lát đọc](WEB_SALES_WORKFORCE_READ_QA_2026-10-31.md). Chỉ QA 3003/API 8081/image 98e232c/database OMTS_QA_98e232c; không sửa backend, không merge và không ghi nghiệp vụ vào 8080.

## Chức năng đã nối

- Owner tạo/sửa sản phẩm, dùng/ngừng dùng. Không thêm giá hoặc kg khi contract không có.
- Thương lái gửi yêu cầu số lồng nguyên dương, ngày nhận, ghi chú; hủy yêu cầu của mình khi chờ hoặc đã chấp nhận. Owner chấp nhận số lồng không vượt yêu cầu, ngày nhận, cho trả sau hoặc từ chối có lý do. Quản lý vùng chỉ xem. Không tự giữ kho, tạo hóa đơn hay thanh toán.
- Owner/quản lý có quyền phân công theo ngày, bè và loại việc; chuyển phân công đã có khi chọn rõ; gỡ trước chấm công; ghi vào/ra bằng giờ hệ thống; đổi việc trong ngày sau check-in. Quyền lấy từ WORK_ASSIGNMENTS/ATTENDANCE và vùng, không suy từ tên role.
- Owner thêm loại việc, lưu phiên bản thiết lập nghỉ/làm tròn theo ngày hiệu lực, đọc lịch sử và duyệt/từ chối nghỉ phép.
- Staff có hồ sơ nhân viên liên kết đọc công việc/ngày công riêng, gửi/hủy nghỉ phép đang chờ. Backend suy nhân viên từ phiên; client không chọn employeeId/accountId. Tài khoản chưa liên kết hiện thông báo rõ và không có nút gửi nghỉ.

Các lệnh có xác nhận trong ứng dụng. Trong lúc xác nhận/ghi, form và đóng bị khóa. Đóng nháp hỏi lại; Quay lại giữ dữ liệu. Mất mạng/5xx/write401/response sai giữ nháp và chặn gửi tiếp; tải danh mục không mở khóa hoặc phát lại lệnh. Create request/leave dùng clientOperationId ổn định trong một lần mở form. Product/request dùng rowVersion; MSG06 cho tải dữ liệu đối chiếu và chỉ nhận phiên bản mới sau thao tác rõ ràng. Kết quả chưa rõ không được mở khóa bằng GET. BFF dùng CSRF, route/body allowlist, kiểm ID/zone response và recheck phiên kể cả upstream204.

## Browser QA thật

| Actor | Luồng đã chạy |
| --- | --- |
| Owner | Tạo QA-SALE31; ngừng dùng rồi dùng lại; tạo 2 loại việc; thiết lập hiện tại và tương lai; chấp nhận 3/5 lồng, đổi ngày nhận và cho trả sau; từ chối yêu cầu khác; duyệt/từ chối nghỉ của 2 vùng |
| quanlyvung1 | Chỉ chọn Ngọc Vừng; phân công Lê Minh Tuấn tại B1-01, vào làm, đổi sang B1-02/việc vệ sinh, ra về; màn riêng có đủ lượt và 2 dòng giờ từ API; gửi nghỉ, hủy nghỉ khác, đọc kết quả duyệt; form ngày đã duyệt nghỉ hiển thị cảnh báo, Quay lại giữ ngày/checkbox, Đồng ý mới bỏ nháp |
| quanlyvung2 | Chỉ chọn Minh Châu; phân công Phạm Thị Lan tại B2-01; chỉ ra về không có vào làm thì màn riêng báo thiếu lượt, không sinh giờ; tạo rồi gỡ phân công tương lai; gửi nghỉ và đọc lý do Owner từ chối; yêu cầu mua chỉ đọc, không có phản hồi/hủy |
| ketoan | Màn riêng đúng Trần Thu Hà, dữ liệu rỗng đúng hồ sơ; không mở quyền quản lý workforce |
| thuonglai1 | Gửi 3 yêu cầu để kiểm chấp nhận/từ chối/hủy, đọc phản hồi, hủy cả trước và sau phản hồi; từ chối thiếu lý do bị native validation giữ ở form; tạo thêm một yêu cầu đang chờ cho tester |

Quay lại ở xác nhận hủy mua giữ nguyên lý do. Native date/time automation có lúc chỉ đổi DOM value hoặc thao tác phím quá nhanh làm quay về giá trị cũ; đã kiểm từng trạng thái và đối chiếu ngày đã lưu trên API trước khi nhận PASS. Không coi những lượt chưa đổi ngày là lỗi ứng dụng hay bằng chứng thành công.

Phát hiện một lỗi hiển thị thật sau hủy yêu cầu đã chấp nhận: điều kiện cho trả sau bị thay bằng dấu gạch dù dữ liệu phản hồi còn giữ. Sửa hiển thị theo việc đã có acceptedCages, phục hồi thời điểm phản hồi, thêm regression; final browser xác nhận Cancelled vẫn thấy 3 lồng/ngày 1/11/cho trả sau Có và thời điểm phản hồi. Đây là lịch sử phản hồi, không phải mở quyền thanh toán cho yêu cầu đã hủy.

Form yêu cầu mua ở đúng tab21: CSS360 dialog client/scroll349/349; CSS1024 dialog511/511, không tràn ngang. Viewport đã reset. Console cuối không có error/warn; các phiên browser/script logout. Không nhận đây là mọi biến thể responsive/race đã hoàn tất.

## Dữ liệu tester giữ lại

- **QA-SALE31**, Hàu QA theo lồng 31/10, đang dùng/nhận yêu cầu; hai loại việc **QA Web chăm sóc 20261031** và **QA Web vệ sinh 20261031**.
- **YC-20261031-F4C2BF613C68**: 4 lồng, nhận 5/11, **Chờ phản hồi**, ghi chú QA tester chờ Owner phản hồi. Dùng Owner để thử bước tiếp theo.
- **YC-20261031-F1C8850867F8**: yêu cầu5/chấp nhận3, nhận1/11, cho trả sau; sau đó Trader hủy, phản hồi và lý do vẫn giữ.
- **YC-20261031-F2A224D2885E**: 2 lồng, đã từ chối có lý do. **YC-20261031-4714565739DE**: 1 lồng, hủy trước phản hồi.
- 31/10: Lê Minh Tuấn B1-02 có đủ vào/ra, API trả 0,004 giờ chăm sóc +0,017 giờ vệ sinh. Phạm Thị Lan B2-01 chỉ có ra về, thiếu lượt, không có giờ tính. Phân công Lan ngày5/11 đã gỡ. Đây là dữ liệu QA, không phải bảng lương hay giao dịch thật.
- Nghỉ phép: Tuấn2/11 đã duyệt, Tuấn3/11 đã hủy; Lan4/11 đã từ chối có phản hồi. Duyệt nghỉ không tạo chấm công hoặc xóa phân công.
- Thiết lập31/10: không có khoảng nghỉ, làm tròn0. Thiết lập1/11: nghỉ12:00–13:00, làm tròn15 phút. Phiên bản có ngày hiệu lực là dữ liệu thật của QA; không có endpoint xóa và không sửa trực tiếp database để che dấu kiểm thử.

Mật khẩu, liên hệ, account/grants seed và hồ sơ liên kết không đổi. Phân công ở vùng làm việc sẵn có, không cấp quyền mới. Database OMTS gốc, backup và image dc00b2f vẫn giữ; chỉ clone nhận các fixture trên. Fake providers giữ thông báo trong QA, không gửi SMS/email thực. Các thông báo mới có thể chưa đọc; không tự đánh dấu đọc để khôi phục số đếm cũ.

## Kiểm tra tự động và giới hạn

66 targeted tests PASS, lint/typecheck/build41routes và61 built-product assertions PASS. Bao gồm integer cage boundaries, Owner/Trader/Staff gates, CSRF, bodyless204/session change, nhân viên lấy từ phiên, unknown không replay, confirm/unmount, conflict giữ lý do/nhận phiên bản đã đối chiếu, lookup giữ lựa chọn, lịch sử trả sau sau hủy và TimeOnly chuẩn hóa. Ma trận HTTP mở rộng **224 checks PASS** với 5 seed accounts +anonymous, chỉ đọc nghiệp vụ và revoke session của script. CI source cuối ghi ở PR, không lấy số full Redis của commit cũ làm bằng chứng mới.

Workforce assign/remove/change-crew/attendance chưa có rowVersion/idempotency công khai; Web không giả bảo đảm optimistic concurrency nguyên tử cho các endpoint đó. Chấm công hiện nối nhập tay; employee QR/login riêng, camera scan, sửa giờ, payroll/pay rates/wage payments, cycle/harvest/invoices/customer debt chưa được coi là đã có khi không có contract tương ứng. Existing Staff onboarding/create-reset, fixed-role writes/new grants, Manager license, certificate deletion và HTX bank vẫn giữ blocker đã chốt. Không tự đổi backend để hoàn thiện thiếu sót này. PR#3 tiếp tục draft, chưa merge.
