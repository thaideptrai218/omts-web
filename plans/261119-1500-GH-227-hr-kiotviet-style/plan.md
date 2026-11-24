# Nhân sự kiểu KiotViet + hoàn thiện Truy xuất - OMTS-227

Nhánh: `feature/OMTS-227-kiotviet-style-reports` (web + backend). Cập nhật: 19/11/2026.
Nguồn: KiotViet `docs/reports/kiotviet-nhan-vien/01..05` → [research-kiotviet-staff.md](research-kiotviet-staff.md); review `../reports/review-nhan-su-2026-11-19.md` (L1-L16), `../reports/review-truy-xuat-nguon-goc-2026-11-19.md` (L1-L8, P1-P8).
Quyết định, mặc định, trạng thái: **[phase-00](phase-00-decisions-and-status.md)** (đọc trước).

## Nguyên tắc
- Tiếng Việt; 360 px và 1024 px; đủ loading/empty/error/denied; không màn dev.
- Component → repository → BFF plan (`src/server/operations/*-plan.ts`), không gọi HTTP trực tiếp.
- File < 200 dòng; sửa file có sẵn, không tạo bản "enhanced"; dùng lại (`QrCodeImage`, `ReportDocument`, `export-menu.tsx`, `DatePickerField`).
- Kiểm: `tsc` + eslint file sửa, `dotnet build` (Docker), curl/headless. Không test dài, không CI, không `docker compose down -v`. Migration chỉ thêm cột nullable.

## Phase
| Phase | Nội dung | Công | PM? | File |
|---|---|---|---|---|
| A | Sửa lỗi L1-L16 nhân sự: giờ phân công lại, ca qua đêm, chốt lương kẹt + tiếng Việt, loại yêu cầu, chi phí lương gross, chống chi trùng, chặn hủy phiếu lương, quyền Kế toán, lỗi nhỏ | M-L | Mặc định Q1-Q4 | [phase-01](phase-01-fix-logic-bugs-vi-errors-access.md) |
| T | Truy xuất: dọn mã thừa (QR, endpoint cũ), lỗi nhỏ, trang công khai chuyên nghiệp, sơ đồ chuỗi + truy xuất xuôi từ lô giống | M | T5 cần PM | [phase-05](phase-05-traceability-followups.md) |
| B | Màn còn thiếu: sửa chấm công, vào làm cả tổ, Staff, chi phí nhân công, kỳ lương, thiết lập nhanh, nghỉ việc an toàn, duyệt hàng loạt, **bảng lương kiểu KiotViet**, **danh sách NV đủ cột** | L | Q6 | [phase-02](phase-02-web-screens-for-existing-backend.md) |
| D | Xuất PDF/Excel (khung `ReportDocument`): bảng lương, phiếu lương, chi phí nhân công; bảng chấm công khi có C2 | M | Không | [phase-04](phase-04-export-timesheet-payslip.md) |
| C | Nâng cấp cần duyệt: lịch tuần, bảng chấm công tháng, lương ngày công/khoán, phụ cấp-thưởng-phạt, hồ sơ có lịch sử, nhập/xuất Excel | L | **Có (Q5)** | [phase-03a](phase-03a-shift-templates-schedule-grid-timesheet.md), [phase-03b](phase-03b-pay-types-adjustments-profile-import.md) |

## Thực thi (giao agent, mỗi đợt chạy song song, tách file sở hữu)
1. **Đợt 1**: Agent A-backend (A1, A2, A5, A6-BE, A7, A8-BE, A10-BE) ‖ Agent T (toàn bộ T1-T4).
2. **Đợt 2**: Agent A-web (A3, A4, A6-web, A8-web, A9, A10-web) ‖ Agent B1-B5.
3. **Đợt 3**: Agent B6-B10 ‖ Agent D.
4. C chỉ bắt đầu khi user chọn ở Q5.
File chung (`permissions.ts`, `operation-plan.ts`, `operation-screen.tsx`, `api-workspace-shell.tsx`, `message-catalog.ts`): chỉ Edit nhỏ, đọc lại trước khi sửa. Sau mỗi đợt: điều phối viên chạy `tsc`, eslint, `docker compose -p omts up -d --build api`, smoke owner/ketoan/quanlyvung1.

## Rủi ro
- A1/A2 đổi giờ các ngày đã phân công lại trong kỳ chưa chốt; bảng đã chốt giữ nguyên. Ghi chú phát hành.
- A5/A8 đổi số liệu/quyền hiển thị → ghi `SRS_DEVIATIONS`.
- Route BFF thiếu khai báo → 404/403: mỗi endpoint mới phải có trong plan BFF.
