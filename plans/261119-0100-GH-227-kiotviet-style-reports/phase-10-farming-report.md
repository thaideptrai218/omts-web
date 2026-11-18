# Phase 10 – Báo cáo Nuôi trồng (ý tưởng của user, không có trong KiotViet)

Mục tiêu: báo cáo định kỳ (ngày / tuần / tháng) cho chủ HTX và Kế toán về tình hình nuôi: chất lượng nước, bè/luống hỏng, hao hụt.

## Dữ liệu đã có (BE, `OMTS.Domain/Entities`)
- `Cultivation/WaterMeasurement`: pH, độ mặn, nhiệt độ theo bè + thời điểm, `ThresholdExceeded`, `ViolatedValues`, ngưỡng đã dùng; bỏ đo = `VoidReason`.
- `Farming/LaneIncident`: sự cố theo luống: Kind (báo hỏng / sửa xong / ngừng dùng), `ReasonCode` (LineBroken, BuoyDamaged, Storm, MassMortality, Other), `Reason`, `HadSeed` (ngừng dùng khi đang có giống = mất giống, **không có số lượng**), vật tư dùng để sửa (chi phí), ảnh.
- `Cultivation/CultivationLog`: nhật ký thăm bè (ngày, ghi chú, ảnh).
- `Cultivation/NurseryBatch.CloseLossPieces`: hao hụt khi hoàn tất ươm (số mảnh).
- `Sales/ProductDisposal` + lô thu hoạch: kg hủy sau thu hoạch. `harvest-yield` đã có kg ước tính/bán/hao.
- `Cultivation/LaneProgressChange`, `CultivationCycle`: tiến độ và trạng thái chu kỳ.

**Giới hạn quan trọng:** hệ thống **không ghi số con/kg hàu chết theo bè hay luống** (quyết định 12/11/2026 trong `LaneIncident`). Vì vậy "hàu hỏng" ở báo cáo = số sự cố luống + luống mất giống + hao hụt ươm (mảnh) + kg hủy sau thu hoạch. Muốn có số hàu chết theo bè phải thêm ô nhập mới (đổi nghiệp vụ: cần user/PM duyệt – **không làm trong phase này**).

## BE mới: `GET api/reports/farming`
Cấu trúc như các báo cáo khác (`Application/Features/Reports/Farming/` Service/Calculator/ExportService/Dtos + `IFarmingReportQuery` + query EF, đăng ký DI, `ReportFilterResolver`, MSG-GEN-10, `/export` xlsx). Quyền: Chủ HTX + Kế toán (D5), lọc vùng bằng `ZoneAccessGuard`.
Params: `from`, `to`, `unit` (day|week|month), `zoneIds[]`, `raftIds[]`.
Trả:
1. **Nước**: theo kỳ và theo bè: số lần đo, số lần vượt ngưỡng, % vượt, pH/độ mặn/nhiệt độ min–TB–max, bè quá lâu chưa đo (> N ngày, N lấy từ cấu hình HTX nếu có, không thì 3).
2. **Bè/luống hỏng**: danh sách bè có luống đang hỏng (chưa sửa) + số ngày hỏng; số sự cố theo `ReasonCode`, theo kỳ; số luống ngừng dùng và số trong đó mất giống (`HadSeed`); chi phí vật tư sửa chữa trong kỳ (từ `LaneIncidentMaterial`/`MaterialUsage`).
3. **Hao hụt**: ươm (Σ `CloseLossPieces` theo đợt hoàn tất trong kỳ); sau thu hoạch (kg hủy từ ProductDisposal + hao so với ước tính ở `harvest-yield` nếu lấy được cùng nguồn).
4. **Chu kỳ**: số chu kỳ đang mở/đóng trong kỳ, số lượt thăm bè (`CultivationLog`) và bè quá lâu chưa thăm.
Ngày theo UTC+7.

## Web
1. Key `farming-report` (menu "Báo cáo", nhóm riêng "Nuôi trồng": Báo cáo nuôi trồng cạnh Sản lượng nuôi), màn `src/features/sales-reports/farming-report-screen.tsx` (hoặc thư mục `farming-reports/` nếu >200 dòng/file), BFF `src/server/operations/farming-report-plan.ts`, contracts zod theo `reports/backend-contracts.md` (bổ sung mục farming).
2. Lọc: kỳ (mặc định 30 ngày), "Xem theo" Ngày | Tuần | Tháng, vùng, bè.
3. Bố cục (dùng `ReportPage`, `BarChart`/`LineChart` đã có):
   - Hàng chỉ số: Số lần đo nước · % vượt ngưỡng · Bè đang có luống hỏng · Sự cố trong kỳ · Hao hụt ươm (mảnh) · Hủy sau thu hoạch (kg).
   - Tab **Chất lượng nước**: biểu đồ đường % vượt ngưỡng + bảng theo bè (đỏ khi vượt; cảnh báo bè lâu chưa đo); bấm bè → màn chất lượng nước của bè.
   - Tab **Bè và luống hỏng**: danh sách đang hỏng (bè, luống, lý do, số ngày), biểu đồ sự cố theo lý do/kỳ, chi phí sửa; link sang bè.
   - Tab **Hao hụt**: ươm (theo đợt) và sau thu hoạch (theo lô).
   - Tab **Chu kỳ và thăm bè**: bảng chu kỳ + bè lâu chưa thăm.
4. Xuất Excel; nút In dùng lại CSS in của phase 7.

## Xong khi
- Tổng lần đo/vượt ngưỡng khớp màn Chất lượng nước cùng kỳ; số luống hỏng khớp màn bè.
- `dotnet build` 0 lỗi; lint + `tsc`; smoke bằng curl với owner và ketoan. **Không viết test mới, không CI.**

## Câu hỏi mở (hỏi user trước/khi xong)
- Có muốn thêm ô nhập "số hàu chết/hỏng" theo bè hoặc lần thăm không? (đổi nghiệp vụ, cần PM duyệt)
- "Báo cáo hằng ngày/tuần/tháng": chỉ xem trên web theo khoảng thời gian, hay tự gửi định kỳ (thông báo/email)? Mặc định: chỉ xem trên web.
