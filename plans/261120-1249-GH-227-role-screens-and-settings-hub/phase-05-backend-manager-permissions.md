# Phase 5 — Chỉnh quyền backend cho Quản lý vùng (theo quyết định 20/11)

**Ưu tiên:** Vừa · **Rủi ro:** Vừa · **Đụng:** backend `D:\Đồ_án\omts-backend` + SRS · **DB:** không migration · **Trạng thái:** Đã có quyết định, chờ lệnh làm

## Quyết định chủ dự án (20/11)
| Việc | Quyết định | Thay đổi backend |
|---|---|---|
| Phân công (kế hoạch ngày công, người phụ trách) | **QLV làm được** trong vùng | `WorkDayPlansController` POST/PUT/responsibles: bỏ `[RequireCooperativeOwner]`, kiểm WORK_ASSIGNMENTS Create/Edit theo vùng |
| Chấm công (sửa chấm công, duyệt nghỉ) | **QLV làm được** trong vùng | `WorkforceController:117,124,141`: kiểm ATTENDANCE Edit theo vùng |
| Bảng lương, đơn giá, mọi thứ tài chính | **QLV không có** | giữ (QLV đã không có PAY_RULES/PAYROLL/thanh toán/công nợ/sổ quỹ) |
| Báo cáo | **QLV xem báo cáo vùng phụ trách** (không phải báo cáo tài chính) | xác định báo cáo nào là "vùng" (sản lượng, thu hoạch, nước, nhân công vùng) → gate theo HARVEST_LOTS/WATER/ATTENDANCE View + zone scope; không mở SALES_REPORTS |
| Kế hoạch thu hoạch | **Owner lập** (từ đơn của thương lái) → **giao QLV xử lý**; QLV **không lập** | giữ HARVEST_PLANS = V cho QLV; cần **chỗ tiếp nhận**: kiểm backend có trạng thái "đã giao / đã tiếp nhận" chưa; nếu chưa, thêm action Tiếp nhận (Edit giới hạn) cho QLV |
| Yêu cầu mua của thương lái | **Chỉ Owner** nhận/từ chối | giữ |
| Nhập giống / nhập vật tư / xuất dùng | **QLV làm được** trong vùng, thấy đơn giá (D2) | giữ PURCHASE_RECEIPTS, INPUT_ISSUES; QLV không có SUPPLIER_PAYMENTS |
| Bán hàng | **Bỏ khỏi QLV** (D1) | `FixedRoles` ZONE_MANAGER bỏ SALES_ORDERS, SALES_INVOICES, SALES_RETURNS, CUSTOMERS, QUALITY_CLAIMS, PURCHASE_REQUESTS; giữ LOT_TRACING, PROVENANCE, HARVEST_LOTS |
| Tiếp nhận / bàn giao thu hoạch | D3 | kiểm `HarvestPlan` có người được giao + trạng thái; thiếu thì thêm action Tiếp nhận + Bàn giao (QLV), Owner nhận bàn giao |
| Sửa chấm công lùi ngày | D5: mọi ngày chưa thuộc kỳ lương đã chốt, lý do bắt buộc, audit | backend đã chặn sửa khi kỳ lương chốt? kiểm; nếu chưa thì thêm |
| Xem vùng khác | QLV xem vùng khác **khi Owner cấp thêm** cặp QLV–vùng | đã hỗ trợ (nhiều grant); chỉ cần UI cấp nhiều vùng ở phase 3 |
| Một Kế toán | **Cảnh báo, OK vẫn lưu** | không đổi backend |
| Kế toán | xem báo cáo, tiền lương, công nợ | đã có (SALES_REPORTS VX, PAYROLL VX, công nợ). Bảo đảm KT có grant "Tất cả vùng" |

## Việc cần kiểm trước khi code
1. Harvest plan: có trường người được giao / trạng thái giao–tiếp nhận không (`HarvestPlan*` entity, controller).
2. Danh sách báo cáo hiện có và mã quyền mỗi báo cáo (9 báo cáo trong menu).
3. QLV hiện có PURCHASE_RECEIPTS VCEDX, SALES_ORDERS VCE, SALES_INVOICES VCX — có chứa giá/tiền. Hỏi chủ dự án có giữ không (xem câu hỏi mở).

## Bước
1. Sửa attribute/ma trận; Owner luôn được.
2. Integration test: QLV vùng A làm được ở A, 403 ở B.
3. Cập nhật `SRS_DEVIATIONS.md`, doc map phase 2, `SRS_UPDATE_HANDOFF_FOR_PM_2026-11-18.md`.
4. Rebuild chỉ service api (hỏi trước).

## Rủi ro
- Đảo một phần quyết định 27/10, 02/11 → ghi decision doc.
- Scope vùng sai → test chéo vùng bắt buộc.
