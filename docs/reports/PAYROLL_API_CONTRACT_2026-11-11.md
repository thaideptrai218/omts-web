# Hợp đồng API Bảng lương và Thanh toán lương (11/11/2026)

Web đã dựng màn **Bảng lương** và **Thanh toán lương** theo KiotViet và gọi đúng các endpoint dưới đây. Backend làm theo bảng này để Web chạy ngay. Zod schema nằm ở `src/features/payroll/contracts.ts`; BFF kiểm tra chặt ở `src/server/operations/payroll-plan.ts`.

## Quy ước chung

- Mọi đường dẫn nằm dưới `/api`. Xác thực Bearer. Người dùng: **chỉ Chủ hợp tác xã** (luật cứng, không theo quyền chức năng; Web chặn ở menu, màn hình và BFF, backend vẫn phải từ chối tài khoản khác). Chủ dùng được mọi nút, không tách quyền theo hành động.
- Tiền: **số nguyên VND** (không có phần lẻ). Ngày: `yyyy-MM-dd`. Thời điểm: ISO-8601 (Web gửi `paidAt` dạng UTC `...Z`).
- Mọi `id` là GUID. Phản hồi thiếu trường hoặc sai kiểu bị Web báo "dữ liệu API chưa khớp" (502), nên cần đúng tên và kiểu.
- Lỗi: Web chỉ dùng **mã trạng thái HTTP** và `code` (nếu có) trong phản hồi lỗi, không hiển thị thông điệp backend. Quy ước hiện dùng: `409` = trùng kỳ làm việc khi tạo ("Đã có bảng lương cho kỳ làm việc này"), hoặc trạng thái không còn cho phép ("Dữ liệu đã thay đổi"); `400` = dữ liệu sai (kỳ trùng khoảng với bảng lương khác, không có nhân viên, không có giờ công...).

## Trạng thái và kiểu

| Tên | Giá trị |
|---|---|
| `periodType` | `Monthly` (Hàng tháng), `Custom` (Tùy chọn) |
| `status` | `Creating` (Đang tạo), `Provisional` (Tạm tính), `Finalized` (Đã chốt lương), `Cancelled` (Đã hủy) |
| `method` | `Cash` (Tiền mặt), `BankTransfer` (Chuyển khoản) |
| `scope` | `All` (Tất cả nhân viên), `Selected` (Tùy chọn: kèm `employeeIds`) |
| `kind` (phiếu chi) | `Wage` (trả lương theo phiếu lương), `Advance` (tạm ứng) |
| `payment.status` | `Recorded` (Đã chi), `Cancelled` (Đã hủy) |

Chuyển trạng thái: `Creating` → `Provisional` (tự động, đồng bộ khi tạo) → `Finalized` (chốt) ; `Provisional` hoặc `Creating` → `Cancelled`. `Finalized` và `Cancelled` là cuối.

## Endpoint

| # | Phương thức và đường dẫn | Yêu cầu | Phản hồi thành công | Lỗi |
|---|---|---|---|---|
| 1 | `GET /api/payrolls` | Query: `search` (mã hoặc tên bảng lương), `periodType`, `status` (lặp lại nhiều lần: `status=Creating&status=Provisional`), `from`, `to` (lọc bảng lương giao khoảng ngày), `page`, `pageSize` (≤100), `sortBy` = `code\|name\|from\|total\|paid\|status`, `sortDir` = `asc\|desc`. Không gửi `status` = mọi trạng thái | `200` `{ items:[{id,code,name,periodType,from,to,total,paid,outstanding,status,createdAt}], total, page, pageSize, summary:{total,paid,outstanding} }`. `summary` là tổng trên **toàn bộ tập đã lọc** (không chỉ trang hiện tại) | 400 query sai |
| 2 | `POST /api/payrolls` | `{ periodType, from, to, scope, employeeIds? }`. `from <= to`. `scope=Selected` bắt buộc `employeeIds` (≥1); `scope=All` không có `employeeIds`. Với `Monthly`, Web gửi cả tháng dương lịch (ngày 1 đến ngày cuối tháng) | `201` `PayrollSheetDetail` (xem mục 3). Tạo **đồng bộ**: trả về `Provisional` (nếu xử lý nền thì trả `Creating` và Web tải lại sau 2 giây) | 400 kỳ trùng khoảng với bảng lương khác còn hiệu lực, không có nhân viên, không có giờ công; 409 đã có bảng lương trùng kỳ |
| 3 | `GET /api/payrolls/{id}` | — | `200` `PayrollSheetDetail` = `{ id, code, name, periodType, from, to, scope, status, expenseMonth (yyyy-MM hoặc null), note, createdBy (tên người tạo hoặc null), createdAt, total, paid, outstanding, slips:[{ id, code, employeeId, employeeCode, employeeName, hours, hourlyRateNote?, mainPay, bonus, deduction, income, net, paid, outstanding }] }` | 404 |
| 4 | `POST /api/payrolls/{id}/reload` | `{ mode: "All" \| "WorkingDaysOnly" }` (`WorkingDaysOnly` = chỉ cập nhật theo ngày làm việc, giữ phần điều chỉnh khác) | `200` `PayrollSheetDetail` | 409 không phải `Provisional` |
| 5 | `POST /api/payrolls/{id}/finalize` | `{ expenseMonth: "yyyy-MM" }` (tháng ghi nhận chi phí lương nhân viên; Web mặc định tháng của ngày cuối kỳ). Khóa dữ liệu lương và chấm công trong kỳ; ghi nhận khoản tạm ứng chưa trừ vào các phiếu lương | `200` `PayrollSheetDetail` (`status=Finalized`, `expenseMonth` đã có) | 409 không phải `Provisional` |
| 6 | `POST /api/payrolls/{id}/cancel` | Không có thân | `200` `PayrollSheetDetail` (`status=Cancelled`) | 409 không phải `Provisional` hoặc `Creating` |
| 7 | `GET /api/payrolls/{id}/export` | — | `200` tệp `.xlsx`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="...xlsx"` (tên chỉ gồm `A-Za-z0-9._-`, Web giữ nguyên tên này) | 404 |
| 8 | `GET /api/payrolls/export` | Cùng query lọc như mục 1 (`search`, `periodType`, `status` lặp lại, `from`, `to`, `sortBy`, `sortDir`; không có phân trang) | `200` tệp `.xlsx` như trên | 400 |
| 9 | `POST /api/payrolls/{id}/payments` | `{ paidAt (ISO-8601), method, note (≤500, có thể rỗng), lines:[{ slipId, amount }] }`. `amount` nguyên, `1..outstanding` của phiếu; cho trả một phần. Mỗi dòng tạo **một phiếu chi** trong Sổ quỹ (loại "Lương nhân viên", đối tượng là nhân viên) và cập nhật `paid`/`outstanding` của phiếu lương và bảng lương | `201` `{ vouchers:[{ id, code, slipId, employeeName, amount }] }` | 400 số tiền vượt còn cần trả hoặc phiếu không thuộc bảng; 409 bảng không phải `Finalized` |
| 10 | `GET /api/payroll-payments` | Query: `search` (mã phiếu chi, tên nhân viên, mã bảng lương), `from`, `to` (theo `paidAt`), `page`, `pageSize` | `200` `{ items:[{ id, voucherCode, paidAt, employeeId, employeeName, payrollId (null nếu tạm ứng), payrollCode (null nếu tạm ứng), method, amount, kind, status }], total, page, pageSize }`, mới nhất trước | 400 |
| 11 | `POST /api/payroll-payments` | `{ employeeId, amount (≥1), paidAt, method, note }`. Nếu nhân viên còn phiếu lương cần trả: trả vào các phiếu **cũ nhất trước** (`kind=Wage`, có thể tạo nhiều phiếu chi nếu vượt một phiếu, phần dư vượt tổng còn nợ thành `Advance`); nếu không còn: `kind=Advance` và được **trừ vào kỳ lương kế tiếp khi chốt** | `201` `{ id }` (id phiếu chi đầu tiên được tạo). Cũng tạo phiếu chi trong Sổ quỹ | 400 nhân viên không hợp lệ |
| 12 | `GET /api/payrolls/payable-employees` | Query: `search` (tên hoặc mã, tùy chọn; Web gửi sau khi người dùng gõ, có debounce), `includeAll` (`true` hoặc bỏ trống) | `200` `{ items:[{ employeeId, code, name, outstanding }] }`. Mặc định chỉ trả nhân viên **còn phiếu lương cần trả** (`outstanding > 0`). Với `includeAll=true` trả **mọi nhân viên đang làm việc**, `outstanding` có thể bằng 0 (chế độ "Tạm ứng cho nhân viên không còn nợ"). `outstanding` = tổng còn cần trả trên các phiếu lương đã chốt. Web dùng `outstanding = 0` để hiện ghi chú "tạm ứng" | — |
| 13 | `GET /api/employees/{employeeId}/payslips` | Query: `page`, `pageSize` (≤100), `status` (tùy chọn, một giá trị trạng thái bảng lương; Web gửi `Finalized` cho tab "Nợ và tạm ứng"). Không gồm phiếu của bảng lương `Cancelled` khi không gửi `status` | `200` `{ items:[{ id, code, payrollId, payrollCode, payrollName, from, to, income, net, paid, outstanding, status }], total, page, pageSize, summary:{ outstanding, advanceBalance } }`. `status` là trạng thái của bảng lương chứa phiếu. `summary.outstanding` = tổng còn cần trả của các phiếu lương **đã chốt** của nhân viên (không phụ thuộc phân trang và `status`); `summary.advanceBalance` = tổng tạm ứng đã chi chưa được trừ vào kỳ lương nào. Mới nhất trước | 404 nhân viên không tồn tại (Web hiển thị như danh sách trống) |
| 14 | `GET /api/payroll-slips/{slipId}` | — | `200` `{ id, code, payrollId, payrollCode, employeeId, employeeName, from, to, hours, mainPay, bonus, deduction, income, net, paid, outstanding, status, lines:[{ jobName, hours, hourlyRate, amount }], payments:[{ id, voucherCode, paidAt, method, amount, kind, status }], attendance:[{ date, jobName, hours }] }`. `lines` = thu nhập theo công việc (giờ × đơn giá); `deduction` gồm cả tạm ứng đã trừ; `payments` = các phiếu chi của phiếu lương này; `attendance` = chấm công của nhân viên trong kỳ làm việc | 404 |
| 15 | `GET /api/payroll-payments?employeeId=<guid>` | Mục 10 có thêm bộ lọc `employeeId`: lịch sử của một nhân viên, gồm cả `Wage` và `Advance` | như mục 10 | 400 |

## Hồ sơ nhân viên (KiotViet mục 7)

Hồ sơ nhân viên (chỉ Chủ hợp tác xã) có thêm hai tab. **Phiếu lương** dùng mục 13: mỗi dòng gồm mã phiếu lương (bấm để mở chi tiết ngay dưới dòng, dùng mục 14), bảng lương (liên kết `/operations/payroll?recordId={payrollId}&search={payrollCode}`), kỳ làm việc, tổng thu nhập, lương thực nhận, đã trả, còn cần trả, trạng thái. Chi tiết phiếu lương có ba phần: Thu nhập và giảm trừ (`lines`, `deduction`), Thanh toán (`payments`), Chấm công chi tiết (`attendance`). **Nợ và tạm ứng** dùng mục 13 với `status=Finalized` (tổng nợ, tạm ứng, danh sách phiếu đã chốt), mục 15 (lịch sử thanh toán và tạm ứng) và nút "Thanh toán lương" gọi mục 11 với nhân viên đã chọn sẵn (không có ô tìm kiếm; ghi chú tạm ứng hiện khi `summary.outstanding = 0`). Tên nhân viên trong phiếu lương của màn Bảng lương liên kết tới `/workspace/employees?recordId={employeeId}&search={tên}`.

Mọi danh sách (mục 1, 10, 13) trả `404` thì Web coi là danh sách trống, không báo lỗi.

## Hành vi Web phụ thuộc vào hợp đồng

- Danh sách mặc định gửi `status` = `Creating`, `Provisional`, `Finalized` (không có `Cancelled`), `sortBy=code`, `sortDir=desc`, `pageSize=15`.
- Dòng tổng dưới tiêu đề bảng dùng `summary`. Cột "Còn cần trả" không sắp xếp được.
- Chi tiết mở tại chỗ: tab **Thông tin** và **Phiếu lương**. Cột Phiếu lương: Mã phiếu lương, Tên nhân viên, Lương chính (`mainPay`, kèm "`hours` giờ × `hourlyRateNote`"), Thưởng (`bonus`), Giảm trừ (`deduction`), Tổng thu nhập (`income`), Lương thực nhận (`net`), Đã trả, Còn cần trả. Hợp đồng **chưa có** làm thêm, hoa hồng, phụ cấp, bảo hiểm, thuế TNCN (xem `SRS_CHANGE_LOG_HR_2026-11-11.md`, HR-B07), nên Web không hiển thị các cột đó.
- Nút theo trạng thái: `Provisional` = Tải lại dữ liệu (2 lựa chọn), Hủy bỏ, Xuất file, Chốt lương; `Finalized` = Xuất file, và Thanh toán ở tab Phiếu lương; `Cancelled` = Xuất file; `Creating` = Hủy bỏ. **"Lưu tạm" chưa có**, vì hợp đồng chưa có endpoint sửa tay từng phiếu lương.
- Thanh toán: sau `201`, Web tải lại bảng lương, hiện "Đã tạo N phiếu chi" và nhắc phiếu chi nằm trong Sổ quỹ.
- Sổ quỹ đã có loại phiếu chi `Payroll` (`CashCategory`); backend dùng loại này và đối tượng `Employee` khi tạo phiếu chi từ mục 9 và 11.
