# API nhân viên cần bổ sung và thay đổi cần cập nhật SRS — 10/11/2026

Mục đích: danh sách chính xác những gì phải thêm ở backend (`omts-backend`, nhánh `develop` db158b44) để màn **Nhân viên** trên Web đạt đúng `docs/DESIGN_GUIDELINES.md` (lọc, sắp xếp, import, xuất file) và gần KiotViet hơn. Mỗi mục ghi rõ phần SRS bị ảnh hưởng để cập nhật tài liệu.

Quy ước: mã use case dùng theo nhãn có trong mã nguồn backend (`LABOR-01` Quản lý nhân viên, `LABOR-01.3` ngừng làm việc). **Chưa đối chiếu được số thứ tự trong file SRS Report3_v8** (không tìm thấy mã nhân viên trong bản markdown) nên cột "SRS" cần người giữ SRS xác nhận lại số.

Mẫu để làm theo: module Nhà cung cấp (`SuppliersController`, `SupplierFileService`, `SupplierListQuery`).

## Tổng quan

| Mã | Thay đổi | Loại | Trạng thái |
|---|---|---|---|
| EMP-API-01 | Lọc danh sách theo loại nhân viên và loại công việc | Thêm tham số | Chưa làm |
| EMP-API-02 | Sắp xếp danh sách phía server | Thêm tham số | Chưa làm |
| EMP-API-03 | Xuất danh sách nhân viên ra .xlsx | Endpoint mới | Chưa làm |
| EMP-API-04 | Tải file mẫu và nhập nhân viên từ .xlsx | Endpoint mới | Chưa làm |
| EMP-API-05 | Chọn nhiều dòng: xuất các dòng đã chọn | Thêm tham số | Chưa làm |
| EMP-API-06 | Bổ sung trường hồ sơ cho form Thêm nhân viên gần KiotViet | Đổi dữ liệu | Cần PM duyệt |

Ngoài phạm vi (cố ý): thiết lập lương, bảo hiểm xã hội, thuế TNCN, phòng ban, chức danh, lịch làm việc, chấm công, bảng lương. Backend `develop` chưa có và thuộc nhánh `feature/OMTS-212-lab` (PR #13) chưa rebase.

## EMP-API-01 Lọc theo loại nhân viên và loại công việc

- `GET /api/employees` thêm hai tham số tùy chọn: `employeeType` (`SeasonalWorker` | `Staff`) và `jobTypeId` (guid). Kết hợp được với `search`, `statusId`, `zoneId` hiện có.
- Giá trị sai: 400 như các tham số lọc khác (trường `employeeType` hoặc `jobTypeId`).
- Quyền: giữ nguyên `LABOR_WORKERS` View. Quản lý vùng vẫn chỉ thấy nhân viên làm việc trong vùng của mình.
- **SRS**: LABOR-01 (xem danh sách nhân viên) thêm hai tiêu chí lọc; màn hình danh sách thêm hai bộ lọc.

## EMP-API-02 Sắp xếp phía server

- `GET /api/employees` thêm `sortBy` và `sortDir` (`asc` | `desc`), giống `SupplierListQuery`.
- `sortBy` hợp lệ: `name`, `phone`, `type`, `status`, `lastWorkingDay`. Mặc định như hiện tại (không đổi hành vi nếu không truyền).
- Sắp xếp áp dụng trên toàn bộ kết quả trước khi phân trang. Sắp xếp phụ cố định theo `id` để trang ổn định.
- Giá trị sai: 400.
- **SRS**: LABOR-01 thêm yêu cầu sắp xếp; màn hình danh sách: tiêu đề cột bấm được.

## EMP-API-03 Xuất danh sách ra .xlsx

- `GET /api/employees/export` nhận đúng bộ tham số của danh sách (`search`, `statusId`, `zoneId`, `employeeType`, `jobTypeId`, `sortBy`, `sortDir`), **không phân trang**, trả `.xlsx`, tên `employees-yyyyMMdd.xlsx`.
- Cột: Họ và tên, Số điện thoại, Loại nhân viên, Loại công việc, Vùng làm việc, Tình trạng, Ngày làm cuối. Chỉ khi người gọi có `canMaintain`: Ngày sinh, Địa chỉ, Khu vực, Phường/Xã, Ngân hàng, Chủ tài khoản. **Số tài khoản ngân hàng không xuất** (đề xuất, xem câu hỏi 1).
- Quyền: thêm hành động `Export` cho chức năng `LABOR_WORKERS` (Chủ HTX; Quản lý vùng nếu PM đồng ý, chỉ nhân viên trong vùng của họ). Hiện catalog chỉ có `Export` cho `PAYROLL`.
- Giới hạn: tối đa 5.000 dòng, quá thì 400 và gợi ý lọc thu hẹp.
- Dùng lại `SpreadsheetSheet` và `ClosedXML` đang có.
- **SRS**: thêm chức năng "Xuất danh sách nhân viên" dưới LABOR-01; bảng phân quyền thêm dòng Export; màn hình thêm nút Xuất file.

## EMP-API-04 File mẫu và nhập nhân viên

- `GET /api/employees/import/template` trả `employees-import-template.xlsx` (hàng tiêu đề, không dữ liệu).
- `POST /api/employees/import` (`multipart/form-data`, một `file`) trả `{ imported, errors: [{ row, fields[], message }] }` giống `SupplierImportResult`.
- Cột nhập: Họ và tên (bắt buộc), Số điện thoại, Ngày sinh, Loại nhân viên (bắt buộc: `Thời vụ` | `Nhân viên`), Vùng làm việc (bắt buộc, **mã vùng**, nhiều vùng cách nhau dấu phẩy), Loại công việc (tên, nhiều giá trị cách nhau dấu phẩy), Địa chỉ, Khu vực, Phường/Xã, Ghi chú, Ngân hàng, Số tài khoản, Chủ tài khoản.
- Kiểm tra từng dòng đúng luật `SaveEmployeeRequest` (độ dài, số điện thoại VN, ngân hàng đủ ba trường hoặc không có, vùng phải tồn tại và đang dùng, trùng số điện thoại giữa nhân viên đang làm = MSG-LABOR-03).
- Giới hạn như nhà cung cấp: 2 MB, 1.000 dòng, chỉ `.xlsx`.
- Hành vi lỗi: **bỏ qua dòng lỗi và nhập các dòng đúng** (giống nhà cung cấp), trả danh sách lỗi theo dòng. KiotViet cho chọn "dừng hoặc bỏ qua"; đề xuất chỉ làm "bỏ qua" (xem câu hỏi 2).
- Quyền: `LABOR_WORKERS` Create. Quản lý vùng nhập được nhưng nhân viên bị gán chỉ vào vùng của họ và cần chủ HTX duyệt (`ownerApproved`) nên **chỉ Chủ HTX được nhập file** (đề xuất).
- **SRS**: thêm chức năng "Nhập nhân viên từ file" dưới LABOR-01 với luồng chính, luồng lỗi theo dòng, giới hạn kích thước; thông báo lỗi dòng cần mã MSG mới (chưa đánh số).

## EMP-API-05 Chọn nhiều dòng

- Ô chọn dòng và "chọn tất cả" chỉ dùng cho **xuất các dòng đã chọn**: `GET /api/employees/export` thêm tham số `ids` (tối đa 200 guid). Khi có `ids` thì bỏ qua các bộ lọc khác.
- Chưa có thao tác hàng loạt thay đổi dữ liệu (ngừng làm việc hàng loạt...) vì mỗi nhân viên có `rowVersion` riêng và cần xác nhận; để lại, hỏi PM (câu hỏi 3).
- **SRS**: chỉ ghi vào chức năng xuất file.

## EMP-API-06 Trường hồ sơ bổ sung (form Thêm nhân viên gần KiotViet)

Form KiotViet có thêm mã nhân viên, giới tính, CCCD, email, ngày bắt đầu làm việc. OMTS hiện không có các trường này. Đề xuất thêm vào thực thể `Employee`, tất cả **tùy chọn** để không phá dữ liệu cũ:

| Trường | Kiểu và luật |
|---|---|
| `code` | Mã nhân viên. Để trống thì hệ thống sinh `NV000001`, tăng dần theo HTX. Nhập tay thì duy nhất trong HTX, tối đa 20 ký tự, chữ không dấu, số, `-`. Trả trong danh sách và chi tiết |
| `gender` | `Male` \| `Female` \| `Other` |
| `idNumber` | Số CCCD, 9 hoặc 12 chữ số. Chỉ trả khi `canMaintain`; **không bao giờ xuất file** (giống danh tính nhà cung cấp) |
| `email` | Hợp lệ theo RFC, tối đa 254 ký tự |
| `startDate` | Ngày bắt đầu làm việc, không sau hôm nay. Khác `typeHistory.effectiveFrom` (ngày hiệu lực loại nhân viên) |

- Đổi `SaveEmployeeRequest` và `EmployeeView` (các trường mới tùy chọn, tương thích ngược), cần migration thêm cột và chỉ mục duy nhất cho `code`.
- Tìm kiếm danh sách mở rộng theo `code`.
- **SRS**: cập nhật mô tả thực thể Employee, danh sách trường của form thêm và sửa nhân viên, quy tắc duy nhất của mã, dữ liệu cá nhân nhạy cảm (CCCD).

Đã có sẵn, không cần làm lại: tạo tài khoản đăng nhập cùng lúc với nhân viên (`SaveEmployeeRequest.account`, chỉ Chủ HTX) và `POST /api/employees/{id}/account`.

## Việc phía Web sau khi có API

- Hiện nút Xuất file và Import ở hàng công cụ, tiêu đề cột bấm được, ô chọn dòng, hai bộ lọc mới (theo `docs/DESIGN_GUIDELINES.md` mục 1.2, 1.3, 1.5).
- Form Thêm nhân viên có nhóm "Thông tin cá nhân" đủ trường EMP-API-06 và nhóm "Tài khoản đăng nhập" (tạo kèm khi lưu).

## Câu hỏi cho PM

1. Có xuất số tài khoản ngân hàng ra file không? Đề xuất không, chỉ tên ngân hàng và chủ tài khoản.
2. Nhập file khi có dòng lỗi: chỉ "bỏ qua dòng lỗi" hay cho chọn cả "dừng" như KiotViet?
3. Có cần thao tác hàng loạt ngừng làm việc hoặc làm việc lại không?
4. Quản lý vùng có được xuất file không? Có được nhập file không?
5. Mã nhân viên: bắt buộc duy nhất toàn HTX hay cho trùng ở nhân viên đã nghỉ?
