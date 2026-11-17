# So sánh PR #76 (Bao, OMTS-227 assign-work) với bản đã merge (A) - 11/11/2026

Phạm vi: chỉ đọc code (git show/diff trên `origin/*`, `gh`), không build, không chạy test. "A" = ours, đã nằm trong `origin/develop` (3d47bdc8 + ae1e1e40). "B" = PR #76 `origin/feature/OMTS-227-assign-work`. "C" = PR #79 `origin/feature/OMTS-227-employee-app`. Số dòng trích từ file ở nhánh tương ứng.

## 1. Kết luận nhanh

- B chỉ làm LABOR-02 (+ bộ tính giờ + work-day view + đọc danh sách nhân viên chọn được). B KHÔNG có chấm công (LABOR-04), duyệt yêu cầu (LABOR-05), LABOR-07/08/10: `IAttendanceDayReader` là stub, `EmployeeWorkRecords.LastAttendanceDayAsync` trả `null` (B: `EmployeeWorkRecords.cs:12`). A phủ cả LABOR-02/04/05/07/08/10.
- Phần LABOR-02, B chặt hơn A ở: khóa lạc quan (rowVersion), chống race job-change, tìm nhân viên toàn hợp tác xã (SRS bước 6), push MSG-LABOR-05 (qua cổng), tách file nhỏ, nhiều test hơn, tính giờ đúng hơn. A đơn giản hơn nhưng có vài lỗ hổng (mục 4).
- Web được xây theo hợp đồng của A, khớp từng đường dẫn/JSON. B đổi toàn bộ đường dẫn và hình dạng JSON nên không dùng được nếu không sửa web.
- Hai bên trùng tên bảng `WorkAssignments` nhưng cột khác tên (`Date`/`StartsAt` ở A, `WorkDate`/`StartTime` ở B) => không merge được, phải chọn một schema. Khuyến nghị giữ schema A.
- PR #79 độc lập với #76 (cùng base a6d0d64d, không chứa commit của nhau), bổ sung LABOR-03/06 mà A chưa có; CONFLICTING chủ yếu ở snapshot/DI/MessageCodes.

## 2. Bằng chứng hợp đồng web (D:\Đồ_án\omts-web)

| Web gọi (nguồn) | A | B |
|---|---|---|
| `GET /api/workforce/assignments?day=` (`new-module-plan.ts:88`) | có (`WorkforceController` `List`) | không (có `GET /api/work-days/{date}`, hình dạng khác) |
| `GET /api/workforce/lookups?day=` (`:88`, `workforceLookupsSchema` contracts:33) | có (`jobs`, `employees{onLeave}`) | không (`assignable-employees`, hình dạng khác) |
| `POST /api/workforce/assignments` body `{raftId,jobTypeId,date,employeeIds,moveExisting}` -> mảng `assignment` (contracts:35, plan:46) | khớp, 201 trả mảng | không: `POST /api/rafts/{id}/work-assignments`, cờ `moveConfirmed`, 201 trả `{assignments,message,messageCode}` |
| `POST /api/workforce/crew-job` -> 204 (plan:47) | khớp | `POST /api/rafts/{id}/crew-job-changes` -> 200 `CrewJobChanged` |
| `DELETE /api/workforce/assignments/{id}` -> 204, không rowVersion (plan:48) | khớp | `DELETE /api/work-assignments/{id}?rowVersion=` |
| `check-in`/`check-out`, `leave-requests/{id}/review`, `/api/me/workforce`, `/api/me/leave-requests` (plan:42-52, 95) | khớp | không có |

Ghi chú web: plan:53 gọi `POST /api/workforce/job-types` nhưng backend (A lẫn B) chỉ có `api/job-types` (`JobTypesController.cs:17`); đây là lệch có từ trước, không do A/B. Web chưa dùng `PUT assignments/{id}`, `crew-start`, `staff-attendance`, `attendance/{id}/{day}`, `login-codes` (grep không thấy).

Nếu chọn B cho LABOR-02: web phải sửa `new-module-plan.ts`, `new-module-contracts.ts`, `workforce-assignment-editor.tsx` (cờ move, xử lý 409 MSG-LABOR-06 theo `moves[]`/`confirmationField` thay cho `employeeIds`), rowVersion khi xóa, các test liên quan. Chi phí cao, lợi ích bằng không (cùng chức năng).

## 3. Ma trận tính năng

Ký hiệu: Y = có, P = một phần, N = không. SRS = SRS v8 yêu cầu; Web = web hiện cần.

| # | Khả năng | A | B | SRS | Web | Quyết định |
|---|---|---|---|---|---|---|
| 1 | Assign work, tất cả-hoặc-không, hôm nay trở đi (LABOR-02.0, BR-LABOR-03) | Y (`WorkAssignmentService.cs:42-130`) | Y (`WorkAssignmentService.cs:32-138`) | Y | Y | Giữ route/JSON A, lấy logic B (mục 4) |
| 2 | Chuyển raft có xác nhận: 409 MSG-LABOR-06 + gửi lại (LABOR-02.4) | Y `moveExisting` (A:87-97) | Y `moveConfirmed` + kiểm quyền zone của raft cũ (B:76-89) | Y | Y (`moveExisting`) | Giữ tên cờ A; thêm kiểm quyền zone raft cũ của B |
| 3 | 409 MSG-LABOR-07 đã check-in | Y (A:82-85, chỉ xét attendance) | Y, xét cả job period (B:67-73) | Y | Y | Merge: dùng điều kiện B |
| 4 | Khóa kỳ lương MSG-LABOR-04 | Y (`PayPeriodLock`, A:75/238/336) | Y (B Guard:72-81) | Y | - | Hòa (cùng `PayPeriodLock` có sẵn trong develop) |
| 5 | Sửa/xóa assignment đến khi check-in (LABOR-02.2) | Y (A:133-212) nhưng không rowVersion | Y + rowVersion + kiểm Employed (B Edit:105-134) | Y | Xóa: Y; Sửa: chưa | Merge: thêm rowVersion tùy chọn vào A |
| 6 | Change job crew: thêm job period / đổi assignment, không push (BR-LABOR-03/04) | Y (A:218-291) | Y + `MarkChanged` chặn 2 job-change song song (B Crew:94-96) | Y | Y | Merge: lấy chống race của B |
| 7 | Chỉ cho đổi crew trong zone được phép | Y từng member (A:259) | Y raft nguồn+đích (B Crew:28-36) | Y | - | Hòa |
| 8 | Thêm zone của raft vào working zones (LABOR-02 bước 9) | Y `AddZoneOfRaft` (A:340) | Y `WorkingZones.Ensure` | Y | - | Hòa |
| 9 | Audit | Y (`WorkAssignment.Created/Moved/Updated/Removed/JobChanged`) | Y (thêm `JobPeriodAdded`) | Y GBR-02 | - | Hòa |
| 10 | Push MSG-LABOR-05 khi giao/sửa/xóa (BR-LABOR-04) | N (ghi chú A:21-23 "không push") | P: cổng `IEmployeeWorkNotifier`, gọi sau save, lỗi chỉ log (B Views); impl hiện là `NoEmployeePushYetNotifier` | Y | - | Lấy B; nối với `IEmployeeNotifier` của C |
| 11 | Chọn nhân viên: lọc theo zone, ưu tiên job type, tìm cả HTX theo tên/SĐT (LABOR-02.0 bước 5-6) | P: `lookups` chỉ nhân viên trong zone, không tìm HTX (`WorkQueryService.cs:48-67`) | Y `AssignableEmployeeQueryService` (giới hạn, chuẩn hóa SĐT) | Y | `lookups` | Merge: giữ `lookups` A, thêm endpoint tìm của B |
| 12 | Màn hình work-day: raft đang dùng + crew + staff + giờ | P: danh sách phẳng, lọc zone trong bộ nhớ (`ListDayAsync` nạp cả ngày mọi zone, `WorkRecordRepositories.cs:16-20`) | Y `WorkDayQueryService`, lọc zone ở repo (`ListOnAsync`) | Y SCR-LABOR-02 | list phẳng | Giữ list A cho web; lọc zone ở DB theo B; work-day tùy chọn |
| 13 | Tính giờ BR-LABOR-05 (3h30, 6h15, 4h20 -> 4h15) | Y (`WorkHoursCalculator`, test `The_srs_example_gives_3h30...`) | Y (`Ac10_gives_3h30...`) | Y | MyWork | Merge: giữ API A, thay phần toán bằng B (mục 4.3) |
| 14 | Chia giờ theo raft cho BR-LABOR-07 | P (`WorkedPeriod.Minutes` đã trừ giờ nghỉ, A:8) | Y (`WorkedPeriodTime` theo raft) | Y | - | Hòa, lấy B nếu làm LABOR-12 |
| 15 | Chấm công check-in/out, thủ công hoặc QR, một bản ghi/ngày (LABOR-04, BR-LABOR-06) | Y; unique (EmployeeId,Date) `AttendanceConfiguration.cs:19` | N | Y | Y | Giữ A (B không có) |
| 16 | Check-out thiếu check-in -> lưu + MSG-LABOR-12; crew-start LABOR-04.8; staff LABOR-04.7; sửa công LABOR-04.4 | Y | N | Y | một phần | Giữ A |
| 17 | Duyệt yêu cầu nhân viên (LABOR-05) + idempotency `clientOperationId` (LABOR-10) | Y (`EmployeeRequestService`, push Owner A:117; push kết quả chưa có A:24) | N | Y | Y | Giữ A |
| 18 | LABOR-07 QR 60 giây, LABOR-08 My work | Y (`HmacAttendanceQrCodes`, `MeWorkforceController`) gắn tài khoản staff, không phải token nhân viên | N (C có `DeriveEmployeeQrKey(deviceId)`) | Y | Y | Giữ A; chỉnh theo C khi C merge (mục 7) |
| 19 | Dừng việc khi nhân viên nghỉ: xóa assignment sau ngày cuối | Y (`EmployeeWorkRecords.cs:16`, ở End + job) | Y và thêm quét "assignment lạc" sau ngày cuối trong job (`RemoveStrayAssignmentsAsync`) | Y BR-LABOR-01 | - | Merge: lấy quét của B (+3 test) |
| 20 | Index/ràng buộc | unique lọc `StartsAt IS NULL` + 4 index đơn (`WorkAssignmentConfiguration.cs:19-26`) | unique lọc + (Emp,Date,Start) + (Raft,Date) (B config:17-23) | - | - | Giữ bảng A, bổ sung index (Emp,Date,StartsAt) |
| 21 | LABOR-03 cấp mã đăng nhập, LABOR-06 đăng nhập app nhân viên | N | N | Y | N | Lấy C |

## 4. Phân tích chi tiết LABOR-02

### 4.1 Điểm A thua B (có bằng chứng)

| Vấn đề ở A | Chứng cứ | B xử lý |
|---|---|---|
| Không khóa lạc quan khi sửa/xóa; hai người sửa/xóa cùng assignment, người sau ghi đè | `EditAssignmentRequest` không có rowVersion; `RemoveAsync` A:186-212 | `RowVersionGuard` + `?rowVersion=` (B Edit:115, Remove:85) |
| Job-change song song cùng member có thể thêm 2 job period cách nhau ms (BR-LABOR-05) | A:278 `assignments.Add(...)` không `MarkChanged(current)` | B Crew:89-96 và test SQL Server `Parallel_job_changes...` (`WorkAssignmentSqlServerTests.cs:177`) |
| Assign song song cùng nhân viên cùng ngày: chỉ nhờ unique index, lỗi rơi vào handler chung "AlreadyExists(Record)" | A:128 không bắt `DuplicateRecordException`; handler ở `ProblemExceptionHandler.cs:26` | B:129-133 trả MSG06 đúng nghĩa |
| `EditAsync` bắt buộc đủ raft + jobType; không kiểm tra nhân viên còn Employed | A:136-141, `RefuseChangeAsync` A:324-337 | B cho sửa một phần, kiểm Employed (B Edit:41-44,125-129) |
| Lỗi sai nhãn khi sửa job period: `Invalid("Date (today or later)")` | A:326-329 | B trả `AlreadyCheckedIn` (B Edit:132-133) |
| Thiếu bước 6 SRS (tìm nhân viên ngoài zone) | `LookupsAsync` A:48-67 | `AssignableEmployeeQueryService` (có `Limit+1` để biết còn nữa) |
| `ListDayAsync` nạp toàn bộ assignment của HTX trong ngày rồi lọc zone trong bộ nhớ (hiệu năng, không lộ dữ liệu vì lọc trước khi trả) | `WorkRecordRepositories.cs:16-20`, `WorkQueryService.cs:40-42` | `ListOnAsync(date, zones)` lọc ở DB |
| Không có push MSG-LABOR-05 | A:21-23 | cổng + gọi sau save (B Views) |
| File lớn: `WorkAssignmentService.cs` 367 dòng gộp 5 trách nhiệm (vượt quy ước 200 dòng) | A file | B tách Guard/Views/WorkingZones/Edit/Crew, mỗi file < 160 dòng |

### 4.2 Điểm B thua A hoặc rủi ro của B

| Vấn đề ở B | Chứng cứ |
|---|---|
| Không có attendance: `IAttendanceDayReader` stub; `LastAttendanceDayAsync` trả null; phải viết lại phần đọc check-in trên bảng `Attendances` của A | `EmployeeWorkRecords.cs:12` (B) |
| Tên/kiểu trùng với A: `IWorkAssignmentRepository`, `WorkAssignment`, `WorkAssignmentConfiguration`, `DbSet<WorkAssignment>`, `WorkAssignmentService`, `AssignWorkRequest`, `WorkedPeriod`, mã `Labor06/07` => lỗi biên dịch hoặc DI trùng nếu gộp thô | diff `OmtsDbContext.cs`, `MessageCodes.cs`, `DependencyInjection.cs` |
| Route khác quy ước web và quy ước A (`api/workforce/*`); bộ test 70+ ca gọi route B, phải viết lại | `WorkAssignmentsController.cs:27-79` |
| Thông điệp đặt trong `UserMessages/MessageCodes` trong khi A đã có `WorkMessages` (hai nơi cho MSG-LABOR-06/07) | diff B vs `WorkMessages.cs` (A) |
| Giới hạn 200 nhân viên/request, A là 100 (không phải lỗi) | B Guard:28, A:39 |
| `WorkDay` trả cả staff (2000 dòng) mỗi lần gọi, gọi `ListEmployedAsync` rồi lọc kiểu bằng bộ nhớ | `WorkDayQueryService.cs:27,43-45` |

### 4.3 Tính giờ (BR-LABOR-05)

Cả hai đạt ví dụ SRS: 06:10 / đổi 09:40 / ra 16:55, nghỉ 11:30-12:30, làm tròn 15' => 3h30 và 6h15, và ví dụ B01/B02 4h20 => 4h15 (test A `WorkHoursCalculatorTests.cs:33-50`; test B `WorkedHoursCalculatorTests.cs:33-47`).

| Tiêu chí | A (`WorkHoursCalculator`) | B (`WorkedHoursCalculator`) |
|---|---|---|
| Lấy sàn phút | từng period rồi cộng (`Math.Floor` mỗi period, A:54) => mất tới 59 giây mỗi period; check-in lưu theo giây (`WorkRules.Now`) nên có thể lệch một nấc làm tròn ở biên | cộng `TimeSpan` rồi sàn một lần (B:62) |
| Giờ nghỉ | cửa sổ nghỉ chỉ của ngày check-in (A:82) | cộng từng ngày period chạm tới, đúng ca qua nửa đêm (B:82-92, test `A_period_that_crosses_midnight...`) |
| Period ngoài khoảng check-in/out | kẹp vào khoảng (A:46-47) | loại bỏ (B:40) |
| Chia theo raft | `WorkedPeriod.Minutes` | `WorkedPeriodTime(RaftId, Worked)` |

Verdict: lấy phép toán B vào lớp của A, giữ chữ ký `Calculate(...)` và các record `DayHours/JobHours` mà `WorkQueryService`/`AttendanceCorrectionService` đang dùng.

### 4.4 Uỷ quyền và phạm vi zone

Cả hai dùng `[RequirePermission(WorkAssignments, ..., AnyZone)]` rồi service kiểm `ZoneAccessGuard` theo zone của raft. Cả hai kiểm quyền Edit trên zone raft cũ khi chuyển. Accountant không có quyền `WorkAssignments` ở cả hai. A thêm `[RequireCooperativeOwner]` cho sửa công và duyệt yêu cầu (đúng SRS LABOR-04.4, LABOR-05). Không thấy khác biệt bảo mật nghiêm trọng; không phát hiện IDOR ở bên nào vì mọi route theo id đều tải bản ghi rồi kiểm zone.

## 5. Mô hình dữ liệu và migration

| Mục | A: `20261110191810_WorkAssignmentsAttendanceAndEmployeeRequests` | B: `20261111060046_WorkAssignments` |
|---|---|---|
| Bảng | WorkAssignments + Attendances + EmployeeRequests (+ seed trạng thái 3801-3804) | chỉ WorkAssignments |
| Cột ngày/giờ | `Date`, `StartsAt` | `WorkDate`, `StartTime` |
| Cột riêng | `Method` (nvarchar 50), `CorrectionReason` (nvarchar 1000) cho sửa công LABOR-04.4 | không có |
| Chung | Id, EmployeeId, RaftId, JobTypeId, AssignedByAccountId, audit, `RowVersion` rowversion, FK Restrict | giống |
| Unique | `UX_WorkAssignments_Employee_Date_First` lọc `[StartsAt] IS NULL` | `UX_WorkAssignments_EmployeeId_WorkDate_FirstPeriod` lọc `[StartTime] IS NULL` |
| Index khác | (Date,RaftId), RaftId, JobTypeId, AssignedByAccountId | (EmployeeId,WorkDate,StartTime), (RaftId,WorkDate), JobTypeId, AssignedByAccountId |
| Ràng buộc | `CK_EmployeeRequests_Period`; không CK trên WorkAssignments | không CK |

Nhận xét: mô hình gần như trùng khái niệm (cùng ý job period, filtered unique đúng BR-LABOR-03). B tạo bảng mới trong khi A đã tạo => migration B sẽ fail trên mọi DB đã áp A ("There is already an object named 'WorkAssignments'"); snapshot B (6277 dòng Designer) cũng sai nền. A hơn vì có `Method/CorrectionReason` cần cho LABOR-04.4, B hơn một chút ở index theo (nhân viên, ngày, giờ) cho truy vấn `ListOfEmployeesOnAsync`. Không có `CHECK` để chặn `StartsAt` hai bên khi `IsFirstPeriod`; chấp nhận được.

## 6. Kiểm thử

| Hạng mục | A | B |
|---|---|---|
| Tích hợp theo tính năng | ~55 ca: Assignment 15, AttendanceRecording 10, Correction 7, QR 3, EmployeeRequest 15, MyWork 5 | ~70 ca chỉ LABOR-02: Assign 16, Edit 12, Move 9, CrewJob 9, WorkDayView 6, Access 5, Assignable 5, Qa 5, EmploymentEnd 3 |
| Unit tính giờ | 10 | 14 (có qua nửa đêm, ngoài khoảng, lệch offset) |
| SQL Server (`[SqlServerFact]`) | 3: migration lên/xuống, luồng đầy đủ, ghi song song | 7: assign song song cùng/khác nhân viên, index cho phép nhiều job period, sửa song song, sửa+xóa song song, job-change song song, race với gửi bảng lương (BR-LABOR-13) |
| Độ sâu cho phần chung | nông hơn (không có race job-change, không rowVersion) | sâu hơn |

Điểm yếu chung: chưa xác nhận được test chạy xanh sau khi gộp (không chạy theo yêu cầu). CI của #76 báo `test (unit)` thành công trên nhánh B.

## 7. PR #79 (LABOR-03/06) - chỉ phần A còn thiếu

- Thêm: `EmployeeAppController` (`api/employee-app/login|refresh|logout`, `device/push-token`), `EmployeeLoginCodesController` (`POST api/employees/{id}/login-codes`, quyền `LaborWorkers.Create`), entity `EmployeeDevice/EmployeeLoginCode/EmployeeSession`, JWT riêng (audience, session claim, `ICurrentEmployee`), rate limit, `EmployeeNotifier` (push qua outbox), migration `20261111064326_EmployeeAppAuth` (bảng mới, không đụng `WorkAssignments`), 9 lớp test tích hợp + SQL Server + unit.
- Va chạm với A: token nhân viên bị MỌI endpoint staff từ chối (test `EmployeeAppTokenIsolationTests`) => `MeWorkforceController` của A (`api/me/*`, dựa tài khoản staff liên kết nhân viên, `WorkQueryService.cs:326 OwnEmployeeAsync`) sẽ không phục vụ app nhân viên thật. Cần chuyển LABOR-07/08/10 sang `ICurrentEmployee` hoặc thêm scheme thứ hai cho các route `/api/me/*`. Mã QR: A dùng HMAC máy chủ (`HmacAttendanceQrCodes`), C có `DeriveEmployeeQrKey(deviceId)` => phải thống nhất một cách (đề xuất khoá theo thiết bị của C).
- Web chưa có nút "Cấp mã đăng nhập" (không có tham chiếu `login-codes`).
- `mergeable=CONFLICTING`: README, DI (Application, Infrastructure), `MessageCodes/UserMessages`, snapshot, `StackMergeQaTestsMigrations`, `FakePushSender`.

## 8. KẾ HOẠCH MERGE

Nguyên tắc: A làm nền (schema, route, JSON, chấm công, yêu cầu); lấy từ B các phần chống race, tìm kiếm, push, tính giờ, test.

### 8.1 Lấy từ B vào develop

| Lấy | File/lớp B | Cách đưa vào A |
|---|---|---|
| Phép toán giờ | `Features/Labor/Hours/WorkedHoursCalculator.cs` (`WorkedTime`, `RoundDown`), `WorkedHoursCalculatorTests` (14) | thay thân `WorkHoursCalculator.Calculate`, giữ record/chữ ký A; đổi `StartTime`->`StartsAt`; gộp test |
| Chống race & rowVersion | `CrewJobChangeService` (đoạn `MarkChanged(current)` + so `StartTime >= now`), `WorkAssignmentEditService.EditableAsync`, catch `DuplicateRecordException` | thêm vào `WorkAssignmentService` của A; thêm `RowVersion` tùy chọn vào `EditAssignmentRequest` và `?rowVersion=` cho DELETE (tùy chọn nên web cũ không gãy) |
| Tìm nhân viên | `AssignableEmployeeQueryService`, DTO `AssignableEmployee(s)`, repo `ListEmployedAsync(zones, text, phone, jobTypeId, limit)` | route mới `GET /api/workforce/assignable-employees?day=&raftId=&jobTypeId=&search=` trong `WorkforceController`; để nguyên `lookups` |
| Push MSG-LABOR-05 | `IEmployeeWorkNotifier`, `WorkAssignmentViews.NotifyAsync`, `WorkAssignmentNotice` | thêm cổng + gọi sau save; adapter sang `IEmployeeNotifier` khi #79 merge; thay `NoEmployeePushYetNotifier` |
| Quét assignment lạc | `EmploymentEndService.RemoveStrayAssignmentsAsync`, `EmployeeWorkRecords.RemoveAssignmentsAfterLastWorkingDaysAsync`, bước trong `EmploymentEndJob`, `WorkAssignmentEmploymentEndTests` | dùng `Date` thay `WorkDate` |
| Lọc zone ở DB | `ListOnAsync(date, zones)`, `ListRaftsInUseAsync` | thay `ListDayAsync` trong `ListAssignmentsAsync` |
| Work-day view (tùy chọn) | `WorkDayQueryService` + DTO | chỉ khi web cần SCR-LABOR-02 dạng raft/crew; đặt route `GET /api/workforce/work-day?day=` |
| Test | 16+12+9+9+5+5+5+6 ca của B và 7 SQL Server | chuyển sang `WorkTestKit` của A và route `/api/workforce/*`; rule: bỏ ca nào trùng test A |

### 8.2 Bỏ từ B

`WorkAssignmentsController` (route), migration `20261111060046_WorkAssignments*` + sửa `OmtsDbContextModelSnapshot`, entity `WorkAssignment` và `WorkAssignmentConfiguration`, `IAttendanceDayReader` + stub (thay bằng đọc `Attendances` của A hoặc dùng `IAttendanceRepository`), `EmployeeWorkRecords` bản B, các hằng `Labor05-07` và `UserMessages` trùng `WorkMessages`, DTO phản hồi `WorkAssignmentsSaved/CrewJobChanged` (trừ khi web đổi), README đoạn xung đột.

### 8.3 Chiến lược migration cho bảng trùng

1. Không merge migration của B. Giữ A (đã ở develop và có thể đã áp lên dev/staging).
2. Không đổi tên cột A (`Date`, `StartsAt`): đổi cột đã áp rủi ro hơn, và code chấm công A đang dùng. Code B đổi `WorkDate->Date`, `StartTime->StartsAt`.
3. Nếu cần index (EmployeeId, Date, StartsAt): một migration mới tên ví dụ `AddWorkAssignmentEmployeeDateStartIndex` (chỉ `CreateIndex`), sinh sau khi rebase lên develop, để snapshot nhất quán.
4. Test `StackMergeQaTestsMigrations` ở B (+8/-?) phải khớp danh sách migration cuối cùng của develop, không để B và C cùng sửa.

### 8.4 Các bước cho Bao (nếu Bao tự làm)

1. `git fetch && git checkout feature/OMTS-227-assign-work && git rebase origin/develop` (hoặc tạo nhánh mới `feature/OMTS-227-assign-work-hardening` từ develop và cherry-pick từng file).
2. Khi xung đột: lấy bản develop cho `WorkAssignment.cs`, `WorkAssignmentConfiguration.cs`, `OmtsDbContext.cs`, `OmtsDbContextModelSnapshot.cs`, `EmployeeWorkRecords.cs`, `MessageCodes.cs`, `README.md`; `git rm` migration `20261111060046_WorkAssignments*`.
3. Đổi tên thuộc tính theo A (`WorkDate`->`Date`, `StartTime`->`StartsAt`); xóa `WorkAssignmentsController`, đưa các action thiếu vào `WorkforceController` theo JSON của A; bỏ `IAttendanceDayReader` stub, dùng `IAttendanceRepository`.
4. Xóa trùng `IWorkAssignmentRepository`: gộp phương thức cần thiết vào interface A.
5. Chuyển test sang `WorkTestKit` A; `dotnet build`, `dotnet test`, SQL Server test với `OMTS_TEST_SQLSERVER` (nếu repo dùng biến này), `dotnet ef migrations has-pending-model-changes`.
6. #79: rebase sau khi #76 xong; giữ migration `EmployeeAppAuth` nguyên Up/Down nhưng sinh lại Designer/snapshot trên develop; sửa DI, `FakePushSender`.

### 8.5 Các bước cho chúng ta (khuyến nghị, nhanh và an toàn hơn)

1. Đóng #76 với ghi chú: "giữ chức năng, đưa các cải tiến vào develop dựa trên hợp đồng đã merge"; ghi công Bao trong commit (Co-authored-by).
2. Một nhánh `feature/OMTS-227-assign-work-hardening` từ develop: cherry-pick tay các mục 8.1 theo thứ tự: tính giờ -> rowVersion/race -> lọc zone DB -> assignable-employees -> sweeper -> cổng push -> test.
3. Sửa web tối thiểu: không cần đổi đường dẫn; thêm (sau) gọi `assignable-employees` cho ô tìm ngoài zone và truyền `rowVersion` khi xóa nếu bật.
4. Merge #79 sau cùng; chuyển `/api/me/*` và QR sang token nhân viên; thêm web "Cấp mã đăng nhập".

### 8.6 Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Bao hiểu "B bị bỏ" là mất công; xung đột nhân sự | giải thích dựa bảng mục 3; ghi nhận B đóng góp 70+ test và logic race |
| Gộp thô gây lỗi biên dịch (trùng tên `WorkAssignmentService`, `IWorkAssignmentRepository`, `WorkedPeriod`) | chuyển theo cherry-pick, không merge nhánh |
| Thêm rowVersion bắt buộc làm gãy web | để tùy chọn, chỉ kiểm khi có |
| #79 khiến `/api/me/*` của A không dùng được cho app thật | chốt thiết kế token trước khi merge #79 (AGENTS.md yêu cầu xác nhận thiết kế phiên/permission) |
| DB dev đã áp migration A; migration mới chỉ thêm index | an toàn, không đổi cột |
| Test SQL Server không chạy trong review này | chạy trước khi merge |

## 9. Khuyến nghị (5 dòng)

1. Giữ A làm nền cho LABOR-02/04/05/07/08/10: khớp 100% hợp đồng web và có chấm công, B không có.
2. Đưa từ B vào: phép toán giờ, rowVersion + chống race job-change, bắt `DuplicateRecordException`, tìm nhân viên toàn HTX, cổng push, sweeper nghỉ việc, lọc zone ở DB, 7 test SQL Server.
3. Không merge #76 nguyên khối; không dùng migration B; không đổi tên cột A.
4. Merge #79 sau, rồi chuyển `/api/me/*` + QR sang token nhân viên và thêm UI cấp mã đăng nhập.
5. Chúng ta thực hiện việc port (nhanh hơn rebase của Bao, tránh xung đột), ghi công Bao.

## 10. Câu hỏi mở

- PM có chấp nhận `moveExisting` (A, web) thay `moveConfirmed` (B) không? (đề xuất giữ A)
- Có cần màn work-day dạng raft/crew (SCR-LABOR-02) ngay, hay danh sách phẳng của web đủ?
- Staging đã áp migration A chưa (quyết định có được đổi tên cột hay không; đề xuất không đổi)?
- Thiết kế QR/token cho app nhân viên: khóa theo thiết bị (C) hay khóa máy chủ (A)? Cần xác nhận theo AGENTS.md vì ảnh hưởng bảo mật.
- Push kết quả yêu cầu (MSG-LABOR-15) và push giao việc (MSG-LABOR-05) có nằm trong phạm vi đợt này hay đợi #79?
- Web đang gọi `POST /api/workforce/job-types` (`new-module-plan.ts:53`) nhưng backend là `api/job-types`: web hay backend sẽ sửa?
