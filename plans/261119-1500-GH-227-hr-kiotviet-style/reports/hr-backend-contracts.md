# HR backend contracts (Phase A backend), 19/11/2026

Backend repo `omts-backend`, branch `feature/OMTS-227-kiotviet-style-reports`, not committed. NOT compiled or smoke-tested by the author (the shell tool was unusable): build first.

## Error envelope (all endpoints)
Problem JSON as before (`title`/`code`/`detail`, extras such as `field`, `existingId`). NEW: member `parameters` (object) whenever the message has parameters. Keys are snake_case as listed below. Use it with `formatMessage({code, params})`.

| Code | Where | `parameters` | Notes |
|---|---|---|---|
| MSG-LABOR-28 (400) | `POST /api/payrolls/{id}/finalize` not ready | `reason_list: string[]` (Vietnamese, names + dates) | extra `items: [{kind, employeeId, employeeName, dates[], jobName}]`, `kind` = `PeriodNotEnded`, `IncompleteAttendance`, `NoRate`, `NoHours`. Link `IncompleteAttendance` to the attendance correction of `employeeId` + each date. |
| MSG-LABOR-28 (409) | same, totals changed | `period, slips_before, slips_now, total_before, total_now` | extra `reasonCode: "TOTALS_CHANGED"`, `currentTotal`, `currentSlips`, `expectedTotal`, `expectedSlips`. Nothing was finalized: show the difference, let the Owner confirm, resend with the new values. |
| MSG-LABOR-31 (409) | finalize, requests awaiting | `period, count, request_list` | |
| MSG-LABOR-34 (400) | pay | `employee_name, owed_amount` | extra `field: "Amount"`, `outstanding` |
| MSG-LABOR-04 (409/400) | dated change in locked period | `period, payroll_status, date, locked_until (yyyy-MM-dd), can_be_sent_back (bool)`, `next_step` is English: do not use | English `detail` kept |
| MSG-LABOR-36 | payroll-settings preview | `period_1, period_2, automatic (bool)` | `auto_note` is English: do not use |
| MSG-GEN-09 (400) `field: "Paid at"` | pay before sheet finalized | `payroll_code, finalized_on` | extra `finalizedOn` |
| MSG-GEN-09 (409) `reasonCode: "PAYROLL_VOUCHER"` | `POST /api/cash-book/vouchers/{id}/cancel` on a wage/advance voucher | `voucher_code` | hide Cancel for types Trả lương / Tạm ứng |
| MSG-GEN-09 (400) `field: "Working zones"` | `PUT /api/employees/{id}` removes a zone with assignments from today on | `employee_name, zone_code, dates[]` | extra `zoneId`, `dates[]` |
| 400 `field: "Period"` create sheet | `hint` now Vietnamese (no hours / overlaps sheet X with its dates); 409 MSG-GEN-02 `existingId` = same period already exists | | |
`detail` of 28, 31, 34 and GEN-09 above is Vietnamese.

## Payroll
- `POST /api/payrolls/{id}/finalize` body `{ expenseMonth, expectedTotal?, expectedSlips? }`. Send `expectedTotal` = detail `total` (net of advances) and `expectedSlips` = detail `employeeCount` as viewed. Omitted = old behaviour.
- Slip hours: `hours` is minutes/60 rounded to 2 decimals; show `7h20` as `round(hours*60)` minutes. Amount is computed from minutes.
- Access: all GET (`/api/payrolls`, `/{id}`, `/export`, `/{id}/export`, `/payroll-payments`, `/payrolls/payable-employees`, `/employees/{id}/payslips`, `/payroll-slips/{id}`, `/api/labor-costs/*`) = PAYROLL View (list/detail/payments/payslips/labor-costs) or Export (the two export routes): Owner + Accountant. POST create, reload, finalize, cancel, `/payments`, `/payroll-payments` = Owner only (403 for Accountant). Zone Manager: 403 on everything.
- Idempotency-Key header on `POST /api/payrolls/{id}/payments` and `POST /api/payroll-payments` (max 64 chars): same key returns the first records (verified by reading the code only).

## Accountant (FixedRoles)
PAYROLL = View, Export only (was full). LABOR_WORKERS = View (new): `GET /api/employees`, `/{id}` work; sensitive fields (birthday, gender, idNumber, address, bank, etc.) are null, `canMaintain=false`, `account` null. Role matrix screens should show PAYROLL View+Export and LABOR_WORKERS View for ACCOUNTANT.

## Attendance
- Re-picked employee (ran after check-out, assigned again same day): a new period with `startsAt = now` is always added, old period closed at the old check-out (`WorkAssignments.EndsAt`, not in any API view). No contract change.
- Night shift: `POST /api/workforce/assignments/{id}/check-out` is accepted for yesterday's assignment row when check-in exists and now - check-in <= 18 h (else 400 `field` "Date (today only)"). The web board must load yesterday's rows (`date=yesterday`) and show "Chưa ra về (từ hôm qua)". Day worked = day of check-in. The returned row is for the check-in day.
- `PUT /api/workforce/attendance/{employeeId}/{day}`: `checkOutAt` may be on `day` or `day+1`, at most 18 h after `checkInAt` (400 `field` "Check-out" otherwise). Periods' `startsAt` must still lie between check-in and check-out.
- Record crew views (nursery/seeding/harvest): `crew[].work.minutes` is now paid minutes (break deducted, rounded down), same as the attendance board and payroll.

## Employees
- `GET /api/employees/{id}/end-employment/preview?lastWorkingDay=yyyy-MM-dd` (needs LABOR_WORKERS Edit and maintain right; default today; after today = 400). Response `EndingConsequences`:
  `{ lastWorkingDay, futureAssignments:[{date, place, jobName}], checkedInNotOut:[date], advanceBalance, unpaidPayslips, unpaidAmount, account:{id,username,displayName,status}|null, accountCanBeLocked }` (`account` and lock: Owner only).
- `POST /api/employees/{id}/end-employment` body `{ lastWorkingDay, rowVersion, lockAccount?: bool }`. Response `{ employee, summary (same shape, computed before the assignments are removed), accountLocked: bool, accountNote: null | "OwnerOnly" | "NoActiveAccount" | <message code of the refusal> }`. The account lock happens after the end is saved; it takes effect at once even when `lastWorkingDay` is today. Ask the Owner to confirm first (Q6).
- `PUT /api/employees/{id}` on a Left employee is now allowed: only `phoneNumber`, `address`, `area`, `ward`, `otherInformation`, `notes`, `bankAccount` are applied; all other fields are ignored. Status Left no longer 409.
- `POST/PUT /api/employees`: response `duplicateIdNumber: { employeeId, code, fullName, message } | null` when another profile has the same idNumber (saved anyway; show a warning).

## Reports
Financial report "Chi trả lương NV" = sum of `MainPay + Bonus` (gross) of Finalized sheets by expense month. Label: "Tổng thu nhập các bảng lương đã chốt".
