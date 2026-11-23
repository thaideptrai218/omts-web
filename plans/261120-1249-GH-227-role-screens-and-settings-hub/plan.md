# Plan: tách màn theo vai trò (Owner / Quản lý vùng / Kế toán) + gom Thiết lập & Quản lý người dùng

**Trạng thái:** ĐÃ CHỐT 20/11 — bắt đầu phase 1.

## Quyết định chốt (20/11)
| # | Quyết định |
|---|---|
| D1 | QLV **không bán hàng** (không đơn, hóa đơn, trả hàng, khách hàng) |
| D2 | QLV **thấy đơn giá** trên phiếu nhập giống/vật tư; danh mục do Owner tạo, QLV chỉ xem; Kế toán trả tiền |
| D3 | Thu hoạch: Owner lập kế hoạch từ đơn thương lái → giao QLV → **QLV tiếp nhận, thu, bàn giao lại Owner** → Owner làm đơn xuất, hóa đơn. Thêm bước tiếp nhận / bàn giao nếu backend chưa có |
| D4 | **Bỏ qua phần lương** (chưa rõ nghiệp vụ HTX) — không làm lát lương/kế toán lương |
| D5 | QLV sửa chấm công: mọi ngày **chưa thuộc kỳ lương đã chốt**, bắt buộc lý do, ghi nhật ký (Claude chọn) |
| D6 | QLV **không** tự tạo nhân viên thời vụ trong lịch vùng |
| D7 | Chấm công hiện trường ở app mobile — **không đụng repo mobile**; web chỉ màn văn phòng |
| D8 | Hiển thị **vùng làm việc (nhân viên) + phân quyền vùng (tài khoản) chung một chỗ** (phase 3) |
| D9 | Thêm Kế toán thứ hai = cảnh báo, OK vẫn lưu | Branch: `feature/OMTS-227-kiotviet-style-reports` (web), backend chỉ đụng ở phase 5 nếu được duyệt.
**Nghiên cứu:** [research-role-screens-and-settings.md](research-role-screens-and-settings.md). Nguồn KiotViet: `docs/reports/kiotviet-thiet-lap/`, `docs/reports/KIOTVIET_USER_PERMISSIONS_RESEARCH_2026-11-20.md`.

## Vấn đề gốc (đã kiểm trong code)
1. **Web tự chặn Manager/Kế toán.** `backend-function-catalog.ts` thiếu 7 mã (HARVEST_PLANS, SALES_ORDERS, INPUT_ISSUES, INPUT_DISPOSALS, PRODUCT_DISPOSALS, CASH_BOOK, CASH_BOOK_SETTINGS) → `collectFunctionPermissions` bỏ qua → các màn này chỉ Owner thấy dù backend đã cấp. Đây là lý do "từ trước giờ toàn dùng owner".
2. **Backend giữ nhiều việc hằng ngày ở Owner** (lập kế hoạch ngày công, sửa chấm công, duyệt nghỉ, nhận/từ chối yêu cầu mua, tạo bè...). Cần chủ dự án quyết từng việc.
3. **Tài khoản rải 3 màn** (Nhân viên → Tài khoản → Vai trò), danh sách không có cột vai trò/vùng/nhân viên, cấp quyền ẩn trong dialog, Owner không đặt lại mật khẩu được (backend có, BFF chưa nối).
4. **Thiết lập nửa vời:** hub `/settings` 5 panel tại chỗ + link nhảy đi; thiếu Thiết lập nhân sự, Kỳ lương; 2 họ URL `/access/*` và `/workspace/*`.

## Nguyên tắc vai trò (ĐÃ DUYỆT 20/11)
- **Quản lý vùng = vận hành hằng ngày** trong vùng được cấp; xem vùng khác khi Owner cấp thêm. Làm: phân công, chấm công, ươm/thả/thu, tiếp nhận kế hoạch thu hoạch được giao, xem báo cáo vùng. **Không:** bảng lương, tài chính, lập kế hoạch thu hoạch, nhận/từ chối yêu cầu mua.
- **Owner = sở hữu + giám sát + cấu hình:** làm được mọi việc của QLV, cộng tài khoản & phân quyền, thiết lập, lập kế hoạch thu hoạch từ đơn thương lái rồi giao QLV, nhận/từ chối yêu cầu mua, chốt lương.
- **Kế toán (1 người, toàn HTX; thêm người thứ hai = cảnh báo, OK vẫn lưu):** tiền, chứng từ, công nợ, tiền lương, báo cáo.

## Phases
| # | Phase | Đụng | Rủi ro | Trạng thái |
|---|---|---|---|---|
| 1 | [Sửa danh mục quyền web + nhãn vai trò + fixture Kế toán](phase-01-fix-web-permission-catalog.md) | web | Thấp | Chờ |
| 2 | [Bảng vai trò → màn (doc quyết định) + menu/bàn làm việc theo vai trò](phase-02-role-screen-map-and-workspaces.md) | web + doc | Thấp–vừa | Chờ |
| 3 | [Quản lý người dùng kiểu KiotViet (hướng A)](phase-03-user-management-kiotviet.md) | web (BFF reset-password) | Vừa | Chờ |
| 4 | [Gom hub Thiết lập](phase-04-settings-hub.md) | web | Thấp | Chờ |
| 5 | [Chỉnh quyền backend cho QLV (đã có quyết định)](phase-05-backend-manager-permissions.md) | backend + SRS | Vừa | Chờ lệnh |
| 7 | [Làm rõ Nhân sự (phân công, chấm công) theo KiotViet](phase-07-hr-module-kiotviet-redesign.md) | web (+backend?) | Vừa | Chờ báo cáo Codex |
| 6 | [Kiểm thử theo vai trò (owner / quanlyvung1 / ketoan)](phase-06-role-walkthrough-verification.md) | web | — | Chờ |

Thứ tự: 1 → 2 → 3 ∥ 4 → 5 (nếu duyệt) → 6. Phase 1 cho hiệu quả lớn nhất, nên làm trước buổi demo.

## Ràng buộc
- Không đổi bảng DB ở phase 1–4. Phase 5 chỉ đổi hằng số `FixedRoles.cs` / attribute `[RequireCooperativeOwner]`, không migration.
- Không đổi logic bán hàng. Cảnh báo thay vì chặn. Theo `DESIGN_GUIDELINES.md`.
- Chỉ chạy test file liên quan + 1 `tsc` + eslint file đổi. Không push.
- AGENTS.md: đổi quyền/vai trò/payload quyền phải hỏi trước → phase 2 và 5 cần duyệt.

## Câu hỏi chưa giải quyết
Xem cuối [research-role-screens-and-settings.md](research-role-screens-and-settings.md#cau-hoi).
