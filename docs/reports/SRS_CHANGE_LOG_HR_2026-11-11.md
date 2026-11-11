# Nhật ký thay đổi nhân sự so với SRS — Web, Backend, DB (11/11/2026)

**Một tài liệu duy nhất** để cả nhóm cập nhật SRS một lượt. Ai làm thêm gì ở phần nhân sự, lương, chấm công thì ghi vào đây.

Cách đọc: mỗi dòng có mã để nhắc nhau. Cột **SRS** cho biết cần sửa SRS hay không. Mã use case dùng nhãn trong mã nguồn backend (`LABOR-01`, `LABOR-12`...). **Chưa đối chiếu được số thứ tự trong `Report3_v8`**, người giữ SRS cần xác nhận lại số.

Trạng thái:
- **XONG**: Web và API đều xong, đã test.
- **WEB-CHỜ-API**: Web đã làm đúng thiết kế, **khác SRS/KiotViet chỉ vì API chưa có** nên hiện trạng khác mong đợi.
- **ĐỔI-SRS**: thay đổi chủ động so với SRS, cần cập nhật SRS.
- **CHƯA**: chưa làm.

Nguồn quyết định: chủ dự án 09–11/11/2026. Bố cục theo `docs/DESIGN_GUIDELINES.md`. Tham chiếu KiotViet: `WEB_EMPLOYEE_KIOTVIET_REFERENCE_2026-11-10.md` và mục C bên dưới.

## A. Thay đổi so với SRS (cần cập nhật SRS)

| Mã | Nội dung | Vì sao | Nơi đổi | SRS |
|---|---|---|---|---|
| HR-A01 | Màn Nhân viên: danh sách, bấm dòng mở chi tiết 4 tab (Thông tin, Công việc, Ngân hàng, Tài khoản đăng nhập), **sửa tại chỗ từng tab** (Bỏ qua / Lưu) | Theo guideline, giống Nhà cung cấp và KiotViet | Web `features/employee-api` | Sửa mô tả màn hình LABOR-01 |
| HR-A02 | Pop-up chỉ còn cho: **thêm mới**, **xác nhận đổi trạng thái** (nghỉ việc, làm việc lại, ngừng dùng), **bí mật hiện một lần** (mật khẩu tạm). Sửa hồ sơ không dùng pop-up | Quyết định 11/11 | `DESIGN_GUIDELINES.md` mục 1.10 | Thêm quy ước giao diện |
| HR-A03 | Ngừng làm việc dùng **ngày làm cuối** (`lastWorkingDay`) và "Cho làm việc lại" dùng endpoint `resume` (bản web cũ dùng `endDate`, `reinstate`) | Khớp backend `develop` | Web + BFF | LABOR-01.3 |
| HR-A04 | **Loại nhân viên** (Thời vụ / Nhân viên) bắt buộc khi thêm; đổi loại phải có "Áp dụng từ ngày"; có lịch sử loại | Backend `EmployeeType`, `TypePeriods` | Web + backend có sẵn | LABOR-01 mô tả thực thể |
| HR-A05 | **Bỏ** "chọn tài khoản có sẵn" và "bỏ liên kết tài khoản" ở form nhân viên. Tài khoản chỉ **tạo mới** (kèm lúc thêm hoặc từ tab Tài khoản, chỉ Chủ HTX), mật khẩu tạm hiện **một lần** | Backend không còn endpoint liên kết/bỏ liên kết | Web | LABOR-01 luồng tài khoản |
| HR-A06 | Thiết lập chấm công dùng `/api/attendance-settings`, làm tròn là enum `None/Minutes15/Minutes30/Hour1` (web cũ: phút 0/15/30/60 ở `/api/workforce/...`) | Khớp backend | Web + BFF | Mô tả thiết lập chấm công |
| HR-A07 | Loại công việc & đơn giá: đổi tên và thêm mốc đơn giá làm **ngay trong tab**, bỏ hộp xác nhận, thay bằng cảnh báo trong tab | Quyết định pop-up | Web `features/labor-api` | Mô tả màn hình đơn giá |
| HR-A08 | Bỏ trang đăng ký `/register`; tài khoản thương lái tạo qua Mini App | Quyết định WEB-REVIEW-01, develop | Web | Đăng ký thương lái |
| HR-A09 | Đăng nhập Web dùng **cookie httpOnly + refresh token + phiên theo thiết bị** (bỏ Redis phía web) | Bạn đồng đội, `develop` | Web + backend | Mục bảo mật phiên |
| HR-A10 | **Đăng nhập chỉ bằng số điện thoại hoặc tên đăng nhập; bỏ email** (đăng ký, đăng nhập, khôi phục mật khẩu, xác minh liên hệ, tài khoản, và trường email của nhân viên). SRS v8 **chưa** ghi thay đổi này | Quyết định chủ dự án 11/11/2026 | Web: bỏ ô email khi cấp tài khoản và thêm nhân viên; backend: đã bỏ email của nhân viên (migration `RemoveEmployeeEmail`). **Chưa làm** ở mô-đun tài khoản backend | **Có, nhiều chỗ** (danh sách ở mục F) |
| HR-A11 | **Bỏ màn Thiết lập kỳ lương**; kỳ trả lương (Hàng tháng / Tùy chọn) chọn ngay trong pop-up "Thêm bảng tính lương" như KiotViet. Trạng thái bảng lương đổi sang **Đang tạo / Tạm tính / Đã chốt lương / Đã hủy** (trước đó ghi Nháp / Chờ chốt / Đã chốt). Thiết lập cách tính giờ công không còn màn hình trên Web, API vẫn còn | Quyết định chủ dự án 11/11/2026, bám KiotViet | Web `features/payroll`, BFF `payroll-plan`; bỏ `features/payroll-settings` | Sửa LABOR-12, LABOR-16 và trạng thái bảng lương |
| HR-A12 | **Bảng lương và thanh toán lương chỉ dành cho Chủ HTX theo quy tắc cứng, không theo quyền chọn.** Kế toán và Quản lý vùng nhận 403 dù vai trò có quyền `PAYROLL` | Quyết định chủ dự án 11/11/2026 | Backend `PayrollsController` (`[RequireCooperativeOwner]`) | Sửa LABOR-12, LABOR-14 (SRS v8 ghi Kế toán lập và trả lương) |
| HR-A13 | **Hồ sơ nhân viên có tab Phiếu lương và Nợ và tạm ứng như KiotViet mục 7** (chỉ Chủ hợp tác xã); cần API phiếu lương theo nhân viên | Quyết định chủ dự án 11/11/2026, KiotViet mục 7 | Web `features/employee-api`, `features/payroll`, BFF `payroll-plan`; API: `GET /api/employees/{id}/payslips`, `GET /api/payroll-slips/{id}`, lọc `employeeId` của `GET /api/payroll-payments` | Bổ sung mô tả hồ sơ nhân viên (LABOR-01) và phiếu lương (LABOR-13) |

## B. Khác với SRS/KiotViet **chỉ vì API chưa làm** (tạm thời)

| Mã | Màn hình, hiện trạng | API cần | Nguồn / nhánh | Kế hoạch |
|---|---|---|---|---|
| HR-B01 | **Phân công và chấm công**: giao diện xong nhưng danh sách báo "Không tìm thấy hồ sơ trên hệ thống" (HTTP 404) | `GET/POST/DELETE /api/workforce/assignments`, `lookups`, `leave-requests`, `check-in`, `check-out`, `crew-job` | Thuộc **OMTS-227 (LABOR-02…16, thiết kế lại theo SRS 27/10) của Bao31203**, chưa có PR. PR #20 và #25 (minhsonneal, Thaissyl) đã **đóng**, không dùng | Chờ API OMTS-227; web đổi theo hợp đồng mới |
| HR-B02 | **Công việc của tôi**: tương tự | `GET /api/me/workforce`, `POST/DELETE /api/me/leave-requests` | Cùng OMTS-227 | Chờ API OMTS-227 |
| HR-B03 | **Bảng lương**, **Thanh toán lương**: chỉ có khung, danh sách trống, không có nút tạo/chốt/thanh toán | `/api/payrolls...`, phiếu lương, thanh toán, tạm ứng | OMTS-227 của Bao31203 (OMTS-212 / PR #13 đã đóng vì SRS 27/10 thiết kế lại LABOR) | Chờ API OMTS-227 |
| HR-B04 | Nhân viên: **chưa lọc theo loại nhân viên / loại công việc, chưa sắp xếp cột, chưa Xuất file, chưa Import, chưa ô chọn dòng** | EMP-API-01..05 (xem `BACKEND_EMPLOYEE_API_CHANGES_FOR_SRS_2026-11-10.md`) | Chưa có | Giai đoạn 1 — API xong trên nhánh feature/web-hr-api-gaps, Web đã nối 11/11 |
| HR-B05 | Form Thêm nhân viên **thiếu** mã nhân viên, giới tính, CCCD, email, ngày bắt đầu làm so với KiotViet | EMP-API-06 | Chưa có | Giai đoạn 1 — API xong trên nhánh feature/web-hr-api-gaps, Web đã nối 11/11 |
| HR-B06 | Loại công việc: không bấm sắp xếp cột | thêm `sortBy/sortDir` cho `GET /api/job-types` | Chưa có | Giai đoạn 1 — API xong trên nhánh feature/web-hr-api-gaps, Web đã nối 11/11 |
| HR-B07 | Lương: **chưa có** thiết lập lương từng nhân viên, mẫu lương, phụ cấp, giảm trừ, bảo hiểm, thuế TNCN (KiotViet có) | Cần quyết định SRS trước (mục D) | — | Giai đoạn 3, cần PM |
| HR-B08 | **Thiết lập kỳ lương, công tắc "Tự động tạo bảng lương"**: lưu được nhưng **chưa có tác dụng** (chưa có tác vụ hằng ngày tạo bảng lương) | Tác vụ tạo bảng lương tự động, đi kèm LABOR-12 (`PayrollSettingsService` ghi chú "comes with LABOR-12") | Backend `develop` | Giai đoạn 3 |
| HR-B09 | **Bảng lương** và **Thanh toán lương** đã dựng đầy đủ theo KiotViet (danh sách, thêm bảng tính lương, chi tiết tại chỗ, chốt/hủy/tải lại/xuất file, thanh toán lương, thanh toán ngoài bảng lương/tạm ứng) và gọi API theo `PAYROLL_API_CONTRACT_2026-11-11.md`. Backend làm tiếp theo hợp đồng này; cho tới khi đó màn hình hiện thông báo lỗi API chuẩn | `/api/payrolls...`, `/api/payroll-payments`, `/api/payrolls/payable-employees` | Chủ dự án làm backend ngay sau Web | Chờ backend theo hợp đồng |

## C. Tham chiếu KiotViet (Quản lý tính lương) và cách áp dụng cho OMTS

Đã đọc nguyên văn trang https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-tinh-luong/ (cập nhật 08/11/2026).

| KiotViet | OMTS áp dụng | Ghi chú |
|---|---|---|
| Thiết lập tính lương chung: ngày bắt đầu kỳ, tự tạo bảng lương, tự cập nhật hằng ngày, cách tính giờ (thực tế hoặc trong ca) | **Có sẵn** `PayPeriodStartDay`, `AutomaticPayroll`; làm tròn/giờ nghỉ ở thiết lập chấm công | OMTS tính **đơn giá theo giờ của loại công việc** (BR-LABOR-05), không có ca |
| Lương chính theo ca / giờ / ngày công chuẩn / cố định, làm thêm giờ, thưởng, hoa hồng, phụ cấp, giảm trừ | Chỉ **theo giờ × đơn giá loại công việc**. Các loại còn lại **chưa** | Cần PM quyết định có mở rộng không |
| Bảng lương: Đang tạo → Tạm tính → **Đã chốt** → Hủy; Tải lại dữ liệu; Lưu tạm; Chốt lương (chọn tháng ghi chi phí) | OMTS: **Nháp → Chờ chốt → (Trả lại) → Đã chốt** (Kế toán lập, Chủ HTX chốt) | Giữ luồng OMTS, bổ sung "Tải lại dữ liệu" và "Lưu tạm" |
| Chốt lương khóa dữ liệu chấm công của kỳ | `PayPeriodLock` đã có | — |
| Thanh toán lương: popup chọn thời gian, phương thức, số tiền từng người, tạo phiếu chi vào Sổ quỹ | Tạo **phiếu chi mục đích Payroll** trong Sổ quỹ (đã có enum) | Cần API |
| Tạm ứng ngoài bảng lương, tự trừ vào kỳ sau | **Chưa có** | Cần PM và API |
| Phiếu lương cá nhân: tab Thanh toán, Chấm công chi tiết; in, xuất, hủy | Tab con trong dòng bảng lương | Giai đoạn 3 |
| Xuất file bảng lương (Excel) | Làm qua API xlsx | Giai đoạn 3 |
| Mẫu lương, danh mục phụ cấp, danh mục giảm trừ | **Chưa** | Cần PM |
| Bảo hiểm bắt buộc (BHXH 8%, BHYT 1,5%, BHTN 1%, đoàn phí 0,5%) và thuế TNCN lũy tiến | **Chưa**; lao động thời vụ hàng hàu thường không thuộc | Cần PM, phụ thuộc luật |
| Lễ tết, ngày làm việc của chi nhánh | **Chưa** | Cần PM |
| Chi phí lương lên báo cáo tài chính | Cần liên kết với báo cáo | Giai đoạn 3 |

## D. Việc backend đã làm theo từng giai đoạn

*(Mục này do người làm backend điền: mỗi giai đoạn ghi nhánh Git, migration, endpoint mới, test đã chạy, điểm khác SRS.)*

### Giai đoạn 1 — API nhân viên và loại công việc

**Nhánh:** `feature/web-hr-api-gaps` (từ `origin/develop` a6d0d64d), chưa push. Commit: `1e755767` (nhân viên), `8d9ff9e7` (loại công việc), `bdee640b` (test).

**Migration:** `20261110180344_EmployeeCodeAndProfileFields` thêm vào bảng `Employees` các cột cho phép null: `Code nvarchar(20)`, `Gender nvarchar(50)` (lưu tên enum), `IdNumber nvarchar(12)`, `StartDate date` (migration này cũng thêm cột `Email nvarchar(254)`, đã bỏ bằng migration `20261110184644_RemoveEmployeeEmail`, xem cuối mục). Thêm chỉ mục duy nhất có lọc `UX_Employees_Cooperative_Code` trên `(CooperativeId, Code) WHERE Code IS NOT NULL` (thay `IX_Employees_CooperativeId`, vì chỉ mục mới đã bao cột đầu). Down xóa tất cả.

**Dữ liệu cũ:** ngay trong migration, nhân viên hiện có được gán `NV000001…` theo thứ tự `CreatedAt, Id`; bộ đếm `DocumentSequences` khóa `NV` = số nhân viên đang có, nên mã mới nối tiếp. Seed demo không đổi: nhân viên demo tạo qua `EmployeeService` nên tự có mã (NV000001–009 trên DB mới); DB demo đang chạy sẽ được migration gán mã.

**Endpoint mới / đổi** (quyền theo `LABOR_WORKERS`):

| Endpoint | Tham số | Quyền | Trả về |
|---|---|---|---|
| `GET /api/employees` (đổi) | thêm `employeeType` (`SeasonalWorker`/`Staff`), `jobTypeId`, `sortBy` (`name`,`code`,`phone`,`type`,`status`,`lastWorkingDay`), `sortDir` (`asc`/`desc`). `search` tìm thêm theo mã. Không truyền sort thì như cũ (vùng của người gọi trước, rồi theo tên) | View | `Paged<EmployeeListItem>`, item có thêm `code` |
| `GET /api/employees/export` (mới) | cùng bộ lọc/sort, không phân trang; `ids` (tối đa 200, dạng `ids=a&ids=b`) thì bỏ qua lọc khác, vẫn theo `sortBy` | **Export** (mới, chỉ Chủ HTX) | `.xlsx`, `employees-yyyyMMdd.xlsx` |
| `GET /api/employees/import/template` (mới) | — | Chủ HTX | `employees-import-template.xlsx`, chỉ hàng tiêu đề |
| `POST /api/employees/import` (mới) | multipart `file` (.xlsx, 2 MB, 1000 dòng) | Chủ HTX | `{ imported, errors: [{ row, fields[], message, messageCode }] }` |
| `GET/POST/PUT /api/employees…` (đổi) | thêm tùy chọn `code`, `gender` (`Male`/`Female`/`Other`), `idNumber`, `startDate` | như cũ | `EmployeeView` có `code`, `gender`, `idNumber`, `startDate` (3 trường sau chỉ khi `canMaintain`) |
| `GET /api/job-types` (đổi) | thêm `sortBy` (`name` mặc định, `rate`, `effectiveFrom`, `status`), `sortDir` | PayRules View | như cũ |

Cột file. Xuất: Mã nhân viên, Họ và tên, Số điện thoại, Loại nhân viên, Loại công việc, Vùng làm việc (mã vùng), Tình trạng, Ngày làm cuối; thêm (chỉ khi người gọi có quyền sửa nhân viên, và chỉ điền ở dòng họ sửa được) Ngày sinh, Giới tính, Ngày bắt đầu làm việc, Địa chỉ, Khu vực, Phường/Xã, Ngân hàng, Chủ tài khoản. **Không bao giờ xuất số tài khoản ngân hàng và CCCD.** Nhập: 13 cột của EMP-API-04 (Họ và tên, Số điện thoại, Ngày sinh, Loại nhân viên, Vùng làm việc, Loại công việc, Địa chỉ, Khu vực, Phường/Xã, Ghi chú, Ngân hàng, Số tài khoản, Chủ tài khoản) + 4 cột tùy chọn (Mã nhân viên, Giới tính, Số CCCD, Ngày bắt đầu làm việc). Cột nhận theo tên tiêu đề tiếng Việt; Loại nhân viên nhận `Thời vụ`/`Nhân viên` (không dấu hoặc tiếng Anh cũng được); vùng theo mã (cách nhau `,` hoặc `;`), loại công việc theo tên (không phân biệt hoa thường); ngày nhận `yyyy-MM-dd`, `dd/MM/yyyy` hoặc ô ngày của Excel.

**Chỗ khác spec/SRS (cần cập nhật SRS):**
1. Nhập file chỉ cho **Chủ HTX** (cả file mẫu), không dùng quyền Create. Quyền `Export` chỉ Chủ HTX giữ; Quản lý vùng giữ nguyên View/Create/Edit (khai báo tường minh trong `FixedRoles`), Kế toán không có. Đã thêm dòng `LABOR-01-EXPORT` vào test ma trận phân quyền.
2. Nhập file **bỏ qua dòng lỗi, nhập dòng đúng** (nhà cung cấp là tất cả-hoặc-không). Ngoại lệ: lỗi đua ghi cùng lúc (trùng SĐT/mã vừa bị người khác lấy) thì trả 409 và không lưu gì.
3. Mã nhân viên: lưu **IN HOA**, không phân biệt hoa thường khi kiểm tra trùng, duy nhất trong HTX kể cả nhân viên đã nghỉ (trả lời tạm câu hỏi 5 của backend doc: chặt). Sửa (PUT) để trống hoặc không gửi `code` = giữ nguyên; gửi mã mới hợp lệ = đổi mã. Mã sinh tự động bỏ qua số đã bị mã gõ tay chiếm.
4. PUT tương thích ngược: không gửi (null) `gender/idNumber/startDate/code` = giữ giá trị cũ; chuỗi rỗng xóa `idNumber`. **Giới tính và ngày bắt đầu chưa xóa được sau khi đã đặt** (cần quyết định).
5. Lọc/sắp xếp theo loại nhân viên dùng **loại đang hiệu lực hôm nay** (giống `typeHistory`). Sắp xếp `status` theo mã trạng thái (Đang làm trước Đã nghỉ); ô trống (SĐT, ngày làm cuối) xếp đầu khi tăng dần (hành vi SQL Server). Khi có `sortBy`, bỏ quy tắc "vùng của tôi lên trước".
6. Xuất có thêm cột Mã nhân viên, Giới tính, Ngày bắt đầu (spec không liệt kê); trạng thái xuất bằng tiếng Việt ("Đang làm việc"/"Đã nghỉ việc").
7. CCCD 9 hoặc 12 số; nhật ký (audit) chỉ ghi "có/không có CCCD", không ghi số. Danh sách không trả CCCD.
8. Hạ tầng: đọc ô ngày của .xlsx nay trả ngày ISO (trước là chuỗi theo định dạng ô); không ảnh hưởng nhà cung cấp (không có cột ngày).
9. Loại công việc: `rate`/`effectiveFrom` là mức giá hiệu lực hôm nay; loại chưa có mức giá hiệu lực xếp đầu khi tăng dần.

**Mã/thông báo dùng:** `MSG-GEN-01` (giá trị sai: `field` = `Sort by`, `Sort direction`, `Ids`, `Filter`, `File`, `Code`, `ID number`, `Start date`, `Gender`…), `MSG-GEN-02` (mã nhân viên trùng, `field: Code`, `existingId`), `MSG-LABOR-03` (SĐT trùng nhân viên đang làm, cả ở lỗi từng dòng nhập). **Cần đánh số MSG mới** (hiện `messageCode` = null, chữ tiếng Anh): "Repeated in this file." (SĐT hoặc mã lặp trong file), "Formulas are not accepted." (dòng có công thức), lỗi file ("At most 2 MB.", "An .xlsx workbook is expected.", "At most 1000 rows.", thiếu cột bắt buộc, "The file has no rows."), vượt 5000 dòng xuất ("At most 5000 employees: narrow the filter.", `field: Filter`). Lỗi dòng thường là MSG-GEN-01 "Missing or invalid." kèm `fields`.

**Đã test** (Docker `mcr.microsoft.com/dotnet/sdk:8.0`): build `OMTS.sln` 0 lỗi. Unit: `OMTS.Application.UnitTests` 1148 đạt, 5 bỏ qua (sẵn có); `OMTS.Domain.UnitTests` 4 đạt. Tích hợp (EF in-memory): các lớp mới `EmployeeListFilterAndSortTests`, `EmployeeProfileFieldsTests`, `EmployeeExportImportTests`, `EmployeeExportLimitTests` (5000/5001 dòng), `JobTypeListSortTests` = 47 đạt; các test nhân viên/lao động có sẵn = 323 đạt (chạy trước khi đổi cách dịch lọc loại sang biểu thức, các test mới chạy sau đó). SQL Server thật (container có sẵn, DB tạm `omts_test_*`): `EmployeeCodeSqlServerTests` 3 đạt (backfill mã + Up/Down/Up, chỉ mục duy nhất không phân biệt hoa thường, lọc/sắp xếp theo loại dịch ra SQL).

**Chưa kiểm chứng được:** lần chạy cả solution bị Docker Desktop treo giữa chừng (quá tải) nên chưa có kết quả đầy đủ; các lỗi thấy trước đó nằm ở `Accounts`/`Audit` (đăng ký bằng email trả "Registration uses a phone number"; hết thời gian chờ kết nối SQL), không liên quan phần này nhưng **chưa so với nền develop**. Chưa thử file Excel tạo bằng Excel thật/locale vi-VN, chưa đo thời gian nhập 1000 dòng trên SQL Server (mỗi dòng kiểm tra vài truy vấn), chưa nối Web.

**Điều chỉnh 11/11: bỏ email của nhân viên.** Quyết định của chủ dự án: không dùng email nữa, tài khoản chỉ đăng nhập bằng tên đăng nhập hoặc số điện thoại; trường `email` của nhân viên (EMP-API-06) thêm ở trên đã bị gỡ hoàn toàn (không còn trong `SaveEmployeeRequest`, `EmployeeView`, kiểm tra hợp lệ, nhật ký audit, file mẫu nhập, nhập, xuất). Migration mới `20261110184644_RemoveEmployeeEmail` xóa cột `Employees.Email` (Down thêm lại cột `nvarchar(254)` cho phép null); migration `20261110180344_EmployeeCodeAndProfileFields` không sửa vì đã chạy trên DB demo. **DB demo đang chạy phải chạy migration mới** (cột bị xóa, email nhân viên nếu có sẽ mất). Tệp backend đổi: `Employee.cs`, `EmployeeConfiguration.cs`, `EmployeeDtos.cs`, `EmployeeInput.cs`, `EmployeeProfileChanges.cs`, `EmployeeViewBuilder.cs`, `EmployeeFileColumns.cs`, `EmployeeFileService.cs`, `EmployeeImportService.cs`, snapshot và migration mới; test `EmployeeInputNewFieldsTests`, `EmployeeProfileFieldsTests`, `EmployeeExportImportTests` (thêm kiểm tra file mẫu và file xuất không có cột Email; body có `email` bị bỏ qua như mọi thuộc tính lạ, phản hồi không có `email`). Đã chạy trong Docker: build `OMTS.sln` 0 lỗi; Application unit `~Employee` 34 đạt; tích hợp (in-memory) các lớp nhân viên 132 đạt, 8 bỏ qua (sẵn có), 0 lỗi. Chưa chạy lại test SQL Server thật sau thay đổi này. **Còn lại, thuộc module ACCOUNT (người khác phụ trách, chưa làm):** email của tài khoản, đăng nhập/đăng ký bằng email, xác minh và khôi phục mật khẩu qua email, Email Service. `NewEmployeeAccount.Email` (email tùy chọn của tài khoản đăng nhập tạo kèm nhân viên) **vẫn giữ nguyên**, sẽ đổi cùng module ACCOUNT. Web: form Thêm nhân viên không nên có ô email nhân viên.

**Câu hỏi mở:** (1) Quản lý vùng có được xuất/nhập không (hiện: không)? (2) Mã nhân viên có cho trùng ở nhân viên đã nghỉ không (hiện: không)? (3) Có cần xóa được giới tính/ngày bắt đầu (cần cách báo "xóa")? (4) Nhập file có cần chế độ "dừng khi có lỗi" như KiotViet không? (5) Số MSG cho các thông báo mới ở trên.

### Giai đoạn 2 — Phân công, chấm công, nghỉ phép (LABOR-02, 04, 05)
**Làm theo SRS v8 (Report-3 V8), không dùng PR #20/#25.** Đã kiểm tra 11/11: PR #20 và #25 **đã đóng** (08/11); bình luận của Bao31203 (31/10) nói LABOR thuộc OMTS-227 và thay thế các PR này. OMTS-227 chỉ có L1 (nhân viên, PR #44) và L2 (loại công việc, thiết lập chấm công, thiết lập kỳ lương, khóa kỳ lương, đầu bảng lương, PR #45) trên `develop`; **không có PR nào cho LABOR-02, 04, 05, 12, 13, 14**. Chủ dự án (11/11) quyết định làm thay. SRS đã mô tả đủ luồng, thực thể (`WorkAssignment`, `Attendance`, `EmployeeRequest`), quy tắc BR-LABOR-xx và thông báo MSG-LABOR-xx.

**Nhánh:** `feature/web-hr-api-gaps` (chưa push). Commit: `3d47bdc8` (API), `ae1e1e40` (test).

**Phạm vi theo SRS v8.** Gửi yêu cầu là **LABOR-10** (nhân viên), duyệt là **LABOR-05** (chỉ Chủ HTX); đã làm cả hai cùng LABOR-02 và LABOR-04 và phần đọc việc của mình (LABOR-07, LABOR-08).

**Migration:** `20261110191810_WorkAssignmentsAttendanceAndEmployeeRequests` (mới; không sửa migration đã chạy).
- `WorkAssignments`: một dòng là một **chu kỳ việc** của nhân viên trong ngày (ngày, bè, loại việc, `StartsAt` rỗng với chu kỳ đầu, người phân công, `Method`/`CorrectionReason` khi Chủ HTX sửa). Chỉ mục duy nhất có lọc `UX_WorkAssignments_Employee_Date_First`: trước giờ vào, một nhân viên có tối đa một phân công mỗi ngày (BR-LABOR-03).
- `Attendances`: duy nhất theo (nhân viên, ngày) (BR-LABOR-06); giờ vào/ra, phương thức từng giờ (`QrCode`, `Manual`, `CrewStart`, `Request`, `Correction`), người ghi, lý do. **Giờ làm không lưu**, tính khi hiển thị (BR-LABOR-05).
- `EmployeeRequests`: loại `Leave` / `MissedCheckIn` / `MissedCheckOut`, từ ngày – đến ngày, giờ yêu cầu, lý do, trạng thái, ghi chú duyệt, `ClientOperationId`. Chỉ mục duy nhất có lọc: một lần gửi theo `clientOperationId`; một yêu cầu giờ thiếu "Chờ duyệt" cho mỗi (nhân viên, loại, ngày).
- Trạng thái mới nhóm `EMPLOYEE_REQUEST`: 3801 Chờ duyệt, 3802 Đã duyệt, 3803 Từ chối, 3804 Đã hủy; chuyển trạng thái 230–232. Down xóa hết. Loại thông báo mới `EMPLOYEE_REQUEST_NEW` (MSG-LABOR-23, cho Chủ HTX).
- Cổng `IEmployeeWorkRecords` của LABOR-01 nay có dữ liệu thật: ngày làm cuối không được trước ngày có chấm công, và kết thúc việc xóa các phân công sau ngày đó (cả tác vụ hằng ngày).

**Endpoint** (Quản lý vùng trong vùng của bè, hoặc Chủ HTX; cột Quyền nói rõ nếu khác):

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `GET /api/workforce/assignments?day=` | WORK_ASSIGNMENTS View | Mỗi nhân viên một dòng/ngày: `id` là chu kỳ đầu, bè và việc là của chu kỳ hiện tại; thêm `complete`, `onLeave`, `employeeCode` |
| `GET /api/workforce/lookups?day=` | WORK_ASSIGNMENTS View | `{ jobs, employees:[{id,name,onLeave, code, phoneNumber, type, jobTypeIds, raftCode, checkedIn}] }` |
| `POST /api/workforce/assignments` | Create | Thân `{raftId, jobTypeId, date, employeeIds, moveExisting}`; 201 + mảng dòng; tất cả hoặc không; 409 `MSG-LABOR-06` (kèm `employeeIds`) hỏi chuyển bè, gửi lại với `moveExisting`; 409 `MSG-LABOR-07` nếu đã vào làm |
| `PUT /api/workforce/assignments/{id}` | Edit | `{raftId, jobTypeId}`; chỉ trước giờ vào (mới so với web) |
| `DELETE /api/workforce/assignments/{id}` | Delete | 204; chỉ trước giờ vào |
| `POST /api/workforce/crew-job` | Edit | `{raftId, jobTypeId, employeeIds}`, hôm nay, 204; người đã vào: thêm chu kỳ việc từ bây giờ, người chưa vào: đổi phân công |
| `POST /api/workforce/assignments/{id}/check-in` và `/check-out` | ATTENDANCE Create | `{qrCode|null}`; trả dòng + `message`/`messageCode` (`MSG-GEN-05`, hoặc `MSG-LABOR-12` khi ra mà chưa vào); 409 `MSG-LABOR-14` nếu đã có giờ; 400 `MSG-LABOR-13` nếu QR sai/hết hạn |
| `POST /api/workforce/crew-start` | ATTENDANCE Create | LABOR-04.8 (mới so với web): `{raftId, startTime "HH:mm", reason, employeeIds}` |
| `GET /api/workforce/staff-attendance?day=`, `POST /api/workforce/staff/{employeeId}/check-in` và `/check-out` | ATTENDANCE View / Create | LABOR-04.7 (mới): nhân viên loại Staff, không cần phân công |
| `GET/PUT /api/workforce/attendance/{employeeId}/{day}` | **Chỉ Chủ HTX** | LABOR-04.4 (mới): xem và sửa giờ vào/ra + các chu kỳ việc của một ngày, bắt buộc `reason`, `rowVersion` của bản ghi |
| `GET /api/workforce/leave-requests?statusId=` | WORK_ASSIGNMENTS View | Chờ duyệt trước (cũ nhất trước), rồi các yêu cầu khác; tối đa 500 |
| `POST /api/workforce/leave-requests/{id}/review` | **Chỉ Chủ HTX** | `{approved, response, rowVersion, jobTypeId?, raftId?}`; từ chối bắt buộc ghi chú |
| `GET /api/me/workforce?from=&to=` | tài khoản có nhân viên liên kết | Tối đa 62 ngày; `{employeeId, name, assignments, attendance:[{date, checkedInAt, checkedOutAt, periods, jobs, complete}], requests}`; tài khoản không có nhân viên nhận về rỗng |
| `GET /api/me/attendance-qr` | như trên | LABOR-07 (mới): mã QR ký HMAC, hiệu lực 60 giây |
| `POST /api/me/leave-requests`, `DELETE /api/me/leave-requests/{id}` | như trên | Gửi nghỉ phép `{from,to,reason,clientOperationId}` hoặc giờ thiếu `{type,day,requestedTime "HH:mm",reason,clientOperationId}` (201); hủy khi Chờ duyệt (200 + yêu cầu có `cancelledAt`) |

Hình dạng JSON khớp `assignmentSchema`, `leaveSchema`, `myWorkSchema`, `workforceLookupsSchema` của web (có thêm trường, không thiếu trường nào).

**Quy tắc đã làm:** BR-LABOR-01 (chỉ nhân viên Đang làm; ngày làm cuối không trước ngày có chấm công), BR-LABOR-03 (phân công cho hôm nay trở đi, bè và loại việc Đang dùng, một phân công/ngày, chuyển bè sau khi xác nhận, chuyển cả đội, thêm vùng của bè vào vùng làm việc), BR-LABOR-05 (giờ = chu kỳ việc trừ giờ nghỉ, cộng theo loại việc rồi làm tròn xuống theo thiết lập hiệu lực ngày đó; ví dụ AC-10 đúng 3 giờ 30 và 6 giờ 15), BR-LABOR-06 (một bản ghi/ngày, QR đổi 60 giây, Staff không cần bè, ra mà chưa vào thì ghi nhưng ngày chưa tính), BR-LABOR-08 (loại yêu cầu, một yêu cầu Chờ duyệt mỗi ngày và loại, hủy chỉ khi Chờ duyệt, duyệt giờ thiếu ghi đè giờ trong ngày với phương thức `Request`), BR-LABOR-13 (khóa kỳ lương), GBR-01, GBR-02 (nhật ký có giá trị trước/sau và lý do, không ghi mã QR), BR-FARM-08 (vùng của bè).

**Mã thông báo dùng:** `MSG-LABOR-04` (khóa kỳ lương, có sẵn), `-06`, `-07`, `-12`, `-13`, `-14`, `-16`, `-22`, `-23`, `-25`, `-26`; `MSG-GEN-01` (tên trường: `Date (today or later)`, `Employees`, `Raft`, `Job type`, `Reason`, `Note`, `Days`, `Day (today or earlier)`, `Requested time`, `Check-in`, `Check-out`, `Job periods`, `Period`...), `MSG-GEN-02` (yêu cầu trùng, kèm `existingId`), `MSG-GEN-05`, `MSG-GEN-08`, `MSG-GEN-09` (yêu cầu không còn Chờ duyệt, nhân viên đã nghỉ, loại việc/bè ngừng dùng). Chưa dùng: `-05`, `-15` (đẩy cho nhân viên), `-10`, `-11` (hộp thoại phía giao diện).

**Khác SRS v8 (cần người giữ SRS xem):**
1. **Chưa có đăng nhập app nhân viên** (LABOR-03 mã đăng nhập, LABOR-06, thiết bị liên kết). Nhân viên gọi các API `/api/me/*` bằng **tài khoản nhân viên liên kết hồ sơ** (`Employee.AccountId`, đã có từ OMTS-227). Không có tài khoản liên kết thì chỉ đọc được rỗng, gửi yêu cầu bị 403.
2. **Không đẩy thông báo cho nhân viên** (MSG-LABOR-05 phân công, MSG-LABOR-15 kết quả yêu cầu) vì chưa có app/thiết bị; nhân viên thấy kết quả trong danh sách yêu cầu. Chủ HTX nhận thông báo yêu cầu mới (MSG-LABOR-23) trong danh sách thông báo, có thể đẩy theo tùy chọn.
3. Mã QR: SRS chỉ nói đổi 60 giây; backend dùng `OMTS-ATT.{mã nhân viên}.{hết hạn}.{chữ ký HMAC}` ký bằng khóa dẫn xuất từ khóa JWT, không bị giả; không cần thiết bị liên kết.
4. Khóa kỳ lương dùng lại `PayPeriodLock` của OMTS-227 (**bảo thủ**: mọi ngày không sau ngày cuối của bảng lương Chờ chốt/Đã chốt đều bị khóa, trả `MSG-LABOR-04`). Riêng yêu cầu của nhân viên: gửi bị chặn chỉ khi kỳ **Đã chốt** (`MSG-LABOR-25`); duyệt bị chặn khi kỳ **Chờ chốt hoặc Đã chốt** (`MSG-LABOR-16`, Chủ HTX vẫn từ chối được).
5. Quản lý vùng xem danh sách yêu cầu nhờ quyền `WORK_ASSIGNMENTS` View (SRS ghi "R", không có function riêng).
6. Yêu cầu nghỉ phép tối đa 366 ngày, lý do tối đa 500 ký tự (chọn thêm). Giờ nhận `HH:mm` hoặc `HH:mm:ss`.
7. Duyệt **giờ vào thiếu** của thợ thời vụ **không có phân công hôm đó** cần `jobTypeId` + `raftId` (LABOR-05.3), nếu thiếu: 400 `Job type`/`Raft`. Giờ ra thiếu và nhân viên Staff không cần.
8. Các giờ vào/ra phải cùng ngày kinh doanh (UTC+7) với `day` khi Chủ HTX sửa; chu kỳ đầu tiên không có giờ bắt đầu, các chu kỳ sau phải nằm giữa giờ vào và giờ ra.

**Khác hợp đồng web:**
- `POST /api/workforce/job-types` (tạo nhanh loại việc, web cũ) **không làm**; dùng `/api/job-types` của OMTS-227.
- Danh sách phân công trả **một dòng cho mỗi nhân viên mỗi ngày** (không phải mỗi chu kỳ việc); `id` luôn là chu kỳ đầu nên khớp `expectedId` của BFF khi vào/ra.
- Thêm endpoint web chưa gọi: `PUT assignments/{id}`, `crew-start`, `staff-*`, `attendance/{employeeId}/{day}`, `me/attendance-qr`; yêu cầu giờ thiếu (loại `MissedCheckIn`/`MissedCheckOut`) qua cùng `POST /api/me/leave-requests`; `leaveSchema` có thêm `type`, `status`, `statusId`, `requestedTime`, `sentAt`, `reviewedAt`, `message`, `messageCode`.
- Thợ thời vụ chưa có phân công mà quét QR (LABOR-04.3/04.5): web gọi `POST assignments` (có `moveExisting`) rồi vào làm; không có endpoint gộp.

**Chưa làm:** đăng nhập app nhân viên và mã đăng nhập (LABOR-03, LABOR-06); đẩy thông báo cho nhân viên; phiếu lương của nhân viên (LABOR-09) và tính tiền từng bè/chu kỳ (BR-LABOR-07), bảng lương (giai đoạn 3; `WorkHoursCalculator` dùng lại được); bảng điều khiển FARM-06 (backend chưa có; khi làm, đếm yêu cầu có trạng thái 3801 Chờ duyệt); không seed dữ liệu demo cho phân công/chấm công.

**Đã test** (Docker `mcr.microsoft.com/dotnet/sdk:8.0`, một container một lúc): build `OMTS.Api` và các dự án test 0 lỗi. Unit `OMTS.Application.UnitTests`: **1160 đạt**, 5 bỏ qua (sẵn có), trong đó 12 test mới của `WorkHoursCalculator` (ví dụ SRS 3 giờ 30 / 6 giờ 15, 4 giờ 20 làm tròn 4 giờ 15, giờ nghỉ, cắt theo giờ vào/ra). Tích hợp (EF in-memory) lớp mới `WorkAssignmentTests`, `AttendanceRecordingTests`, `AttendanceCorrectionTests`, `EmployeeRequestTests`, `MyWorkTests`, `AttendanceQrCodeTests`: **55 đạt**. SQL Server thật (container có sẵn, DB tạm `omts_test_*`): `WorkSqlServerTests` **3 đạt** (migration lên/xuống/lên, luồng đầy đủ, ghi song song một phân công/một giờ vào/một yêu cầu: một thắng, còn lại 409, không 500). Chạy lại các nhóm sẵn có chạm tới: `Labor`, `Employees`, `Notifications`, `Persistence`, `Audit`, `Authorization`, `AccessManagement` (in-memory) = 538 đạt, 1 lỗi sẵn có của `Audit` (đăng ký bằng email trả "Registration uses a phone number", đã ghi ở giai đoạn 1). Trên SQL Server, 4 test cũ của `StackMergeQaTestsMigrations` **lỗi và không do thay đổi này**: so danh sách "migration cuối cùng" cứng (lệch từ khi thêm migration giai đoạn 1), nhóm `PURCHASE_RETURN` có 2 trạng thái khởi đầu, cột `Discount`/`ZoneId` không tồn tại khi xuống bước cũ; chưa đối chiếu trên nền `develop`. Một lần chạy cả nhóm trên SQL Server bị `OutOfMemory` ở container 3 GB (chạy lại từng lớp thì qua).

**Câu hỏi mở:** (1) Khi nào làm đăng nhập app nhân viên (mã đăng nhập, thiết bị liên kết) và đẩy thông báo? Hiện nhân viên dùng tài khoản liên kết. (2) Chủ HTX có được sửa chấm công của nhân viên đã nghỉ không (hiện: có, theo SRS "mọi nhân viên, mọi ngày")? (3) Khóa kỳ lương cho phân công/chấm công hiện bảo thủ (mọi ngày trước bảng lương bị khóa); có cần chỉ khóa đúng kỳ chứa ngày như BR-LABOR-13 không? (4) Có cần endpoint xem giờ làm của cả đội theo ngày cho Quản lý vùng (SCR-LABOR-02 hiện chỉ có giờ vào/ra)?

### Giai đoạn 3 — Bảng lương, phiếu lương, thanh toán (LABOR-12, 13, 14)
**Làm theo hợp đồng web `PAYROLL_API_CONTRACT_2026-11-11.md` (JSON) và SRS v8 (quy tắc)**, mức A của chủ dự án: giờ × đơn giá loại công việc theo ngày hiệu lực, không làm thêm, hoa hồng, bảo hiểm, thuế. **Chỉ Chủ HTX** (mục HR-A12). Nhánh `feature/web-hr-api-gaps`, chưa push.

**Migration:** `20261110201319_PayrollSheetsPayslipsAndWagePayments` (mới). `Payrolls` thêm `Code` (BL000001), `PeriodType`, `Scope`, `ExpenseMonth`, `Note`, `CancelledAt/By`; bỏ chỉ mục duy nhất theo `PeriodStart` và `PeriodEnd` (hai bảng lương cùng kỳ được phép khi khác nhân viên); thêm chỉ mục duy nhất có lọc theo `Code`. Bảng mới: `PayrollLines` (phiếu lương, PL000001), `PayrollLineJobs` (giờ theo loại việc và đơn giá), `PayrollSelectedEmployees`, `WagePayments` (mỗi dòng một phiếu chi sổ quỹ, khóa chống gửi lại `RequestKey`+`RequestSequence`), `PayrollAdvanceDeductions` (phần tạm ứng đã trừ). Trạng thái mới 3405 Đang tạo, 3406 Đã hủy; chuyển trạng thái 233 đến 236. "Tạm tính" của hợp đồng là trạng thái "Nháp" (3401) có sẵn. Dữ liệu cũ: header demo cũ nhận mã BL theo thứ tự kỳ, `PeriodType` Monthly nếu là cả tháng, bộ đếm BL tiếp nối. Không tạo loại phiếu chi mới: `Chi trả lương NV` (`CashCategory.Payroll`) đã có từ migration sổ quỹ.

**Endpoint** (tất cả `[RequireCooperativeOwner]`, 403 MSG-GEN-08 cho người khác, 401 khi chưa đăng nhập):

| Endpoint | Ghi chú |
|---|---|
| `GET /api/payrolls`, `GET /api/payrolls/export` | Lọc `search`, `periodType`, `status` (lặp), `from`, `to`; `sortBy` code/name/from/total/paid/status; `summary` trên cả tập đã lọc; xuất `payrolls-yyyyMMdd.xlsx` tối đa 5000 dòng |
| `GET /api/payrolls/{id}`, `GET /api/payrolls/{id}/export` | Chi tiết và `payroll-BL000001.xlsx` (tên chỉ `A-Za-z0-9._-`, `Cache-Control: no-store`) |
| `POST /api/payrolls` | 201 Tạm tính. 409 `MSG-GEN-02` (kèm `existingId`) khi cùng kỳ và trùng nhân viên với bảng khác chưa hủy; 400 khi kỳ chỉ giao nhau, kỳ tháng không phải cả tháng dương lịch, kỳ tùy chọn quá 366 ngày, bắt đầu sau hôm nay, không có giờ công, danh sách nhân viên sai |
| `POST /api/payrolls/{id}/reload` | `All` hoặc `WorkingDaysOnly`; 409 nếu không phải Tạm tính |
| `POST /api/payrolls/{id}/finalize` | Cần kỳ đã kết thúc, không có chấm công thiếu giờ vào hoặc ra, không có giờ thiếu đơn giá (400 `MSG-LABOR-28`), không có yêu cầu nhân viên đang chờ duyệt (409 `MSG-LABOR-31`); tính lại, trừ tạm ứng, khóa kỳ (`PayPeriodLock` đọc trạng thái Đã chốt) |
| `POST /api/payrolls/{id}/cancel` | Chỉ Đang tạo hoặc Tạm tính; Đã chốt không bao giờ hủy được |
| `POST /api/payrolls/{id}/payments` | Header tùy chọn `Idempotency-Key`; mỗi dòng một `WagePayment` và một phiếu chi (Tiền mặt `CTM`, chuyển khoản `CNH`, loại `Chi trả lương NV`, đối tượng nhân viên); 400 `MSG-LABOR-34` khi vượt còn nợ |
| `GET/POST /api/payroll-payments`, `GET /api/payrolls/payable-employees` | Trả phiếu cũ nhất trước, phần dư hoặc khi hết nợ là Tạm ứng, trừ vào lần chốt kế tiếp có nhân viên đó; `includeAll`; lọc `employeeId` |
| `GET /api/employees/{id}/payslips`, `GET /api/payroll-slips/{id}` | Mục 13, 14 của hợp đồng |

**Quy tắc:** BR-LABOR-05 (giờ), BR-LABOR-10 (kỳ, tính từ chấm công hiện tại cho tới khi chốt), BR-LABOR-11 (thanh toán một phần, không quá còn nợ, phiếu chi hủy ở Sổ quỹ thì tiền quay lại "còn nợ"), BR-LABOR-12 (đơn giá theo ngày hiệu lực), BR-LABOR-13 (khóa kỳ), GBR-02 (nhật ký `Payroll.Created/Reloaded/Finalized/Cancelled`, `WagePayment.Recorded`). **Mã thông báo:** `MSG-GEN-01/02/09`, `MSG-LABOR-28`, `-31`, `-34`, `-04` (khóa kỳ, có sẵn). Chữ thông báo vẫn là tiếng Anh theo SRS như các mô-đun khác (web chỉ đọc mã trạng thái và `code`).

**Khác SRS v8:** (1) Không có bước "gửi cho Chủ HTX" và "trả lại": Chủ HTX tạo, chốt, trả (luồng KiotViet, HR-A11). (2) Có tạm ứng, SRS v8 ghi "không trả trước" (BR-LABOR-11), theo quyết định 11/11. (3) Nhân viên Staff không có phiếu lương (BR-LABOR-09; SRS còn muốn liệt kê số ngày công, chưa làm). (4) Chỉ có thưởng 0, không có điều chỉnh (BR-LABOR-10), không chia chi phí theo bè (BR-LABOR-07). (5) Chưa có hủy riêng khoản thanh toán; hủy phiếu chi ở Sổ quỹ là cách hủy. (6) Không có cảnh báo trùng tham chiếu ngân hàng (MSG-LABOR-33) và thông báo cho Chủ HTX (MSG-LABOR-32, vì Chủ HTX là người thao tác). (7) Hết kỳ mới chốt được (SRS cũng vậy); Tạm tính không khóa dữ liệu (SRS khóa từ lúc gửi).
**Khác hợp đồng web:** trạng thái HTTP khi trùng kỳ theo hợp đồng (409 cùng kỳ, 400 giao nhau), không theo "409 mọi trường hợp trùng" của yêu cầu giao việc; `id` trong danh sách thanh toán và kết quả thanh toán là id phiếu chi của Sổ quỹ; hủy bảng lương Đã chốt luôn 409 (yêu cầu giao việc nói "trừ khi không có thanh toán"); trạng thái Đang tạo không bao giờ lưu (tạo đồng bộ).

**Quyền còn theo mã chức năng (chưa là luật cứng Chủ HTX), chưa đổi:** `JobTypesController` (loại công việc và đơn giá, quyền `PAY_RULES`, Kế toán có Full), `WorkforceController` và `MeWorkforceController` (quyền `WORK_ASSIGNMENTS`, `ATTENDANCE` theo vùng), `EmployeesController` (quyền `LABOR_WORKERS`; nhập file và tạo tài khoản đã là Chủ HTX). `LaborSettingsController` (thiết lập chấm công, kỳ lương) đã là luật cứng Chủ HTX. Chủ dự án cần quyết định `PAY_RULES` có thành luật cứng không. Quyền `PAYROLL` còn trong `FixedRoles` cho Kế toán nhưng không có tác dụng với các endpoint mới.

**Dữ liệu demo:** `DemoPayrollStep` (chỉ khi `seed --bootstrap --demo`) thêm chấm công 100 ngày cho thợ thời vụ có loại việc, bảng lương tháng trước nữa Đã chốt (một phiếu trả một phần tiền mặt, một phiếu trả đủ chuyển khoản, một tạm ứng 500.000) và bảng lương tháng trước Tạm tính. Idempotent: đã có phiếu lương nào thì bỏ qua. Hai header rỗng cũ của demo bị thay; `DemoLaborSettingsStep` không còn tạo header.

**Chưa làm:** hủy riêng khoản thanh toán, in danh sách trả tiền mặt (LABOR-14.3), thông báo, điều chỉnh và chi phí theo bè, phiếu lương của nhân viên (LABOR-09), tạo bảng lương tự động (GFR-07).

## E. Câu hỏi mở cho PM

1. Mở rộng lương ngoài "giờ × đơn giá" (ca, ngày công chuẩn, cố định, làm thêm, phụ cấp, giảm trừ, thưởng) không?
2. Có bảo hiểm và thuế TNCN trong OMTS không?
3. Tạm ứng lương: có làm không, trừ vào kỳ nào?
4. Số tài khoản ngân hàng có được xuất ra file không?
5. Quản lý vùng có xuất và nhập file nhân viên không?
6. Bao31203: kế hoạch và hợp đồng API các lớp OMTS-227 sau L2 (phân công LABOR-02…, chấm công, nghỉ phép, bảng lương LABOR-12…14) là gì, khi nào có PR? Web sẽ chỉnh theo hợp đồng đó (PR #20 và #25 đã đóng, không dùng).

## F. Email: những chỗ SRS v8 còn ghi (cần sửa theo quyết định 11/11)

Nguồn: bản trích văn bản của Report-3 V8 (số dòng là dòng trong bản trích, chỉ để tra nhanh). Quyết định: **đăng nhập chỉ bằng số điện thoại hoặc tên đăng nhập, không còn email.**

| Chỗ trong SRS v8 | Hiện ghi | Cần đổi |
|---|---|---|
| ACCOUNT-01 Register trader account (dòng 979) | đăng ký bằng số điện thoại **hoặc email** | chỉ số điện thoại |
| ACCOUNT-02 Log in (980), SCR-ACCOUNT-02 (1235) | đăng nhập bằng username, phone **hoặc email** | username hoặc số điện thoại |
| ACCOUNT-03 Recover password (981), SCR-ACCOUNT-03 (1236) | mã gửi tới số điện thoại **hoặc email** đã xác minh | chỉ số điện thoại (SMS) |
| ACCOUNT-05, ACCOUNT-06 (983–984, 1075), SCR-ACCOUNT-01, 04, 05 (1234, 1237–1238) | thêm, đổi, xác minh **email**; đăng ký bằng email | bỏ email; xác minh chỉ số điện thoại |
| Quy tắc "Unique username, phone and email" (866), "Staff account data… email is optional" (868) | username, phone và email duy nhất | bỏ email |
| Thực thể Account (604–605) | thuộc tính email (unique), "Business identity: Username, phone number and email" | bỏ email |
| Hệ thống ngoài "Email Service" (934), API-03 Send email (212, 1288) | gửi mã xác minh và đổi mật khẩu qua email | bỏ nếu không còn kênh email |
| Bảng thuật ngữ OTP (355) | "sent by SMS or email" | chỉ SMS |
| Lịch sử sửa đổi (253–257) | UC theo email | thêm dòng sửa đổi 11/11 |
| Nhân viên (Employee) | (SRS không có trường email; Phase 1 từng thêm rồi **đã gỡ**) | không đổi |

**Cần PM quyết định:** email **liên hệ** (không phải đăng nhập) ở hồ sơ hợp tác xã (dòng 592) và nhà cung cấp (682, SCR-PURCHASE-06 dòng 1249) giữ hay bỏ? Tôi chưa đụng tới.

**Backend (mô-đun tài khoản, của người khác): chưa làm.** Đăng nhập, đăng ký, khôi phục và xác minh bằng email vẫn chạy trên `develop`. Web đã bỏ email ở phần cấp tài khoản và thêm nhân viên.
