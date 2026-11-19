# HR wave 3 contracts (B9, B10, D, gaps), 19/11/2026

Backend `omts-backend`, branch `feature/OMTS-227-kiotviet-style-reports`, not committed. API rebuilt with `docker compose -p omts up -d --build api`; smoke done as owner, ketoan, quanlyvung1.

## Exports (`format=pdf|xlsx`, default xlsx; other value = 400 field "format"; `Cache-Control: no-store`; PAYROLL Export: Owner + Accountant, Zone Manager 403)
| Route | File | Notes |
|---|---|---|
| `GET /api/payrolls/{id}/export` | `BangLuong_BL…pdf` or `payroll-BL….xlsx` (xlsx unchanged) | landscape table, total row first, footer = cooperative short name from the profile |
| `GET /api/payroll-slips/{id}/export` (new) | `PhieuLuong_PL….pdf/.xlsx` | employee, period, income by job (hours x rate), deduction, net, paid, owed; payments; attendance by day. No ID number, no bank account |
| `GET /api/labor-costs/export?from&to&zoneId` (new) | `ChiPhiNhanCong_yyyyMMdd_yyyyMMdd.pdf/.xlsx` | by raft with hours + split by job type |
List export (`/api/payrolls/export`) stays Excel only. Web BFF: payroll export action takes `format` and `kind=slip` (+ `id`); labor-costs `export`.

## Payroll
- Sheet detail: `calculatedAt` (UTC; last create/reload/finalize). Web "Cập nhật lần cuối" uses it.
- Slip detail: `employeeCode`; `attendance[]` rows = day + job type: `raftCodes` ("B1-01, B2-01" or null), `checkInAt`, `checkOutAt` (offset +07:00), `hourlyRate`, `amount` = round(minutes x rate / 60). Daily amounts can differ from the slip line by a few dong (the slip rounds once per period).
- Pay requests (`POST /api/payrolls/{id}/payments`, `POST /api/payroll-payments`): optional `cashAccountId`. Only with `method=BankTransfer`, an active Bank account of `GET /api/cash-accounts`; with Cash or another kind = 400 `Cash account`. Omitted = as before (voucher without account).

## Labor costs (BR-LABOR-07)
- `GET /api/labor-costs/rafts`: items get `hours`, `byJob[{jobTypeId, jobName, hours, amount}]`; top `totalHours`.
- `GET /api/labor-costs/cycles/{id}`: adds `hours`, `byJob`, `employees[{employeeId, employeeCode, employeeName, hours, amount, byJob}]`.
- `GET /api/labor-costs/rafts/{raftId}/cycles` (new, PAYROLL View): list of the above per cycle, newest first. The web detail uses it, so Accountant no longer needs CULTIVATION_CYCLES View.

## Employees list
`GET /api/employees` items: `monthHours` (paid hours 1st of month to today) and `outstandingWage` (owed on finalized sheets) for PAYROLL View callers; null for others. One grouped read per page. Web: columns "Giờ công tháng này" and "Nợ lương"; the separate `payable-employees` read was removed.

## Web notes
- `ExportMenu` moved to `src/components/ui/export-menu.tsx` (sales-reports file re-exports it).
- Sheet detail: status chip + calculatedAt header, totals row on top of the payslip table, hours/pay buttons open the slip on "Chấm công chi tiết"; slip detail tabs "Thanh toán" / "Chấm công chi tiết" with "Tải xuống".
- Pay dialog: "Tài khoản chi" for bank transfer (first active Bank account preselected), "Trả toàn bộ".
