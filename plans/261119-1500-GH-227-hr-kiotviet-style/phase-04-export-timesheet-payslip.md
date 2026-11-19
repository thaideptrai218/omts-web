# Phase D - Xuất PDF/Excel cho bảng lương, phiếu lương, bảng chấm công, chi phí nhân công

Ưu tiên: trung bình. Trạng thái: chưa làm. Công: M. Không đổi nghiệp vụ. Phụ thuộc: A8 (Kế toán xem/xuất), B4 (chi phí nhân công), C2 (bảng chấm công tháng). Phần bảng lương + phiếu lương hiện có làm được ngay sau A/B; cột Điều chỉnh bổ sung sau C4.

## Khung có sẵn (tái dùng, không viết lại)
- Backend: `Features/Reports/Documents/ReportDocument.cs` (`ReportDocument`, `ReportSection`, `ReportColumn`, `ReportRow` Group/SubGroup/Detail), `ReportDocumentExport.cs` (`ParseFormat`, `Write`), render `Infrastructure/Reports/ReportDocumentPdfRenderer.cs` và `ReportDocumentExcelRenderer.cs`. Mẫu đầy đủ: `Features/Reports/EndOfDay/EndOfDayExportService.cs` + `EndOfDayDocumentBuilder` + `EndOfDayReportController.Export` (`format=pdf|xlsx`, tên `BaoCaoCuoiNgay_yyyyMMdd`).
- Web: `features/sales-reports/export-menu.tsx` (`ExportMenu`, `ExportFormat`), `server/operations/end-of-day-report-plan.ts` (tham số `format`, `exportFormat: "pdf"`), hook `use-end-of-day-report.ts` (`exportFile(format)` -> `repo.download`).

## D1 Bảng lương (danh sách + chi tiết) - Công S-M
- `PayrollExportService.cs`: hiện ghi `.xlsx` bằng `ISpreadsheetWriter`. Thêm tham số `format`; xây `PayrollSheetDocumentBuilder.cs` (mới, cùng thư mục): tiêu đề "BẢNG LƯƠNG {mã}", dòng lọc (kỳ làm việc, trạng thái, tháng ghi chi phí), một `ReportSection` các phiếu (Mã phiếu, Mã NV, Tên, Số giờ, Lương chính, Thưởng/Phụ cấp, Phạt, Tổng thu nhập, Giảm trừ (tạm ứng), Thực nhận, Đã trả, Còn cần trả) + hàng `Group` tổng. Chân trang ghi người lập/ngày lập theo `ReportDocument.FooterText`.
- Giữ tương thích: không có `format` vẫn trả `.xlsx` như hiện nay (xlsx có thể chuyển sang `ReportDocumentExcelRenderer`; chỉ đổi khi test cũ vẫn qua). Danh sách bảng lương xuất theo cùng cơ chế.
- `PayrollsController.cs`: `GET payrolls/{id}/export?format=`; `GET payrolls/export?...&format=`. Header `Cache-Control: no-store` giữ nguyên (dữ liệu cá nhân). Quyền `Payroll` Export (Owner + Kế toán).
- Web: thay nút xuất hiện tại ở `features/payroll/payroll-detail-footer.tsx` và `payroll-screen.tsx` bằng `ExportMenu`; `server/operations/payroll-plan.ts` nhận `format: z.enum(["pdf","xlsx"])` như `end-of-day-report-plan.ts:34-36`.

## D2 Phiếu lương cá nhân (PDF) - Công M
- Nội dung theo `TLR_081126-47` đã rút gọn cho OMTS: tên HTX, tiêu đề "PHIẾU LƯƠNG {mã phiếu}", mã/tên NV, loại NV, kỳ làm việc, tên bảng lương; **Bảng 1** thu nhập theo loại việc (Loại việc, Số lượng + đơn vị, Đơn giá, Thành tiền) + Phụ cấp/Thưởng (C4); **Giảm trừ** (Phạt, Tạm ứng đã trừ); **Thực nhận**, Đã trả, Còn cần trả; **Bảng 2** chấm công chi tiết theo ngày (ngày, bè, việc, vào, ra, giờ đã trừ nghỉ). Số tài khoản ngân hàng chỉ hiện 4 số cuối.
- Backend: `PayslipDocumentBuilder.cs` (dùng `PayrollQueryService.GetSlipAsync`), endpoint `GET api/payroll-slips/{slipId}/export?format=pdf|xlsx` trong `PayrollsController.cs`; tên `PhieuLuong_{mã}`; quyền `Payroll` Export.
- Web: `payroll-slip-detail.tsx` thêm `ExportMenu` ("Tải xuống") và nút "In" (mở PDF bằng trình duyệt); `employee-payslips-tab.tsx` cho từng dòng. Tab "Chấm công chi tiết" theo KiotViet có thể là hai tab trong dialog.
- In hàng loạt phiếu cả bảng (một PDF nhiều trang): `GET payrolls/{id}/slips/export?format=pdf` - làm nếu hạn chế; mỗi phiếu một `ReportSection`, ngắt trang bằng khung hiện có.

## D3 Bảng chấm công tháng - Công S (sau C2)
- `TimesheetDocumentBuilder.cs` (`Features/Labor/Work/`): ma trận NV x ngày, có thể rộng 31 cột: dùng hướng ngang nếu renderer hỗ trợ (kiểm `ReportDocumentPdfRenderer`; nếu chưa, xuất PDF theo tuần hoặc chỉ Excel cho ma trận đầy đủ, PDF cho bản tóm tắt tổng giờ theo NV). Endpoint `GET api/workforce/timesheet/export?...&format=`, quyền như C2 + `Export`.
- Web: `ExportMenu` trong `timesheet-screen.tsx`; tên `BangChamCong_{yyyyMM}`.

## D4 Chi phí nhân công theo bè/chu kỳ (sau B4) - Công S
- `LaborCostDocumentBuilder.cs` (`Features/Labor/Costs/`), endpoint `GET api/labor-costs/export?...&format=`; `ExportMenu` ở `labor-costs-screen.tsx`.

## D5 Danh sách nhân viên PDF - Công S
- `EmployeeFileService.cs` hiện xuất Excel (`GET employees/export`): thêm `format=pdf` bằng `ReportDocument` (không CCCD, không ngân hàng - giữ nguyên quy tắc "không xuất dữ liệu cá nhân"); `employee-directory.tsx` dùng `ExportMenu`.

## Dùng chung và chất lượng
- Nếu `ExportMenu` cần dùng ngoài báo cáo bán hàng, di chuyển sang `src/components/ui/export-menu.tsx` và để `features/sales-reports/export-menu.tsx` re-export một dòng (tránh import chéo feature mới; DRY).
- Văn bản: tiếng Việt có dấu, số VND `#,##0`, ngày dd/mm/yyyy, giờ HH:mm; ô văn bản ghi dạng text (chống công thức Excel như cũ, `ReportCellText.cs`); tên file chỉ chữ/số/gạch.
- Lỗi renderer: trả thông báo `FileOperationFailed` chung (đã có), không trả tệp dở dang.
- Test: một test backend mỗi builder (số dòng, tổng, tiêu đề) trong `tests/OMTS.Application.UnitTests/Features/Labor/`; không cần test hình ảnh PDF. Web: kiểm bằng tay tải PDF/Excel một bảng lương đã chốt và mở được.

## Chấp nhận
- Tải PDF và Excel bảng lương BL000001: tổng khớp màn hình; phiếu lương PL của NV có giờ theo loại việc khớp "Số giờ" phiếu; Kế toán tải được, Quản lý vùng nhận 403; PDF không chứa CCCD/ngân hàng đầy đủ.

## Rủi ro
- PDF ma trận rộng (D3): có thể cần chỉnh renderer hoặc đổi bố cục; làm D3 sau cùng.
- Dữ liệu cá nhân: giữ `no-store`; không ghi log nội dung phiếu.

## Việc cần làm
- [ ] D1 [ ] D2 [ ] D3 [ ] D4 [ ] D5 [ ] Di chuyển `ExportMenu` nếu cần
- [ ] Lint, typecheck, build; `dotnet build` + test builder.
