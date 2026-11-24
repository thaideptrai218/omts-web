# Phase 2 — Bảng vai trò → màn + bàn làm việc theo vai trò

**Ưu tiên:** Cao · **Rủi ro:** Thấp–vừa · **Đụng:** web + doc · **Cần duyệt:** có (AGENTS.md) · **Trạng thái:** Chờ

## Mục tiêu
Một bảng chốt "ai làm màn nào" để đối chiếu nhanh, và mỗi vai trò đăng nhập vào thấy đúng việc của mình.

## Đầu ra
1. **Doc quyết định** `docs/decisions/ROLE_SCREEN_MAP_2026-11-20.md`: bảng màn × (Owner / QLV / KT) với mức Xem / Làm / Duyệt / Không; sinh từ `FixedRoles.cs` + Owner-only list. Đây là "tờ đối chiếu" thay cho mò code.
2. **Menu theo vai trò** (`api-workspace-shell.tsx`): giữ gate theo mã quyền (không theo tên vai trò); chỉ sắp lại thứ tự nhóm:
   - QLV: Việc hôm nay → Nuôi trồng → Nhân sự (giao việc, chấm công) → Vật tư → Bán hàng (đơn, hóa đơn).
   - KT: Tiền (sổ quỹ, công nợ, thanh toán) → Lương → Mua/Bán (xem) → Báo cáo.
   - Owner: Tổng quan → mọi nhóm → Thiết lập.
   Thứ tự quyết bởi tập quyền đang có, không hardcode tên vai trò.
3. **Bàn làm việc** ở `/dashboard`:
   - QLV: "Việc hôm nay trong vùng" — kế hoạch ngày công, người chưa vào làm, lô chờ cân, kế hoạch thu hoạch được giao, đợt ươm sắp xong, cảnh báo nước. Dùng API sẵn có, lọc theo vùng được cấp.
   - KT: "Việc tiền hôm nay" — phiếu nhập chờ thanh toán, công nợ đến hạn, phiếu thu chờ xác nhận, kỳ lương.
   - Owner: dashboard tổng hiện có + khối "Chờ Owner duyệt" (yêu cầu mua, sửa chấm công, khiếu nại...).
   Owner có thể chuyển xem bàn làm việc vùng (tùy câu hỏi 4).

## File
- Tạo: doc quyết định; `src/features/workspace-home/zone-manager-today.tsx`, `accountant-today.tsx`, `owner-pending-approvals.tsx` (mỗi file <200 dòng), test kèm.
- Sửa: `api-workspace-shell.tsx` (thứ tự nhóm), `overview-access.ts`, trang dashboard.

## Bước
1. Viết doc map, đưa chủ dự án duyệt.
2. Sắp menu; test snapshot nhóm cho 3 bộ quyền.
3. Bàn làm việc QLV, KT, khối Owner chờ duyệt (đọc API hiện có, skeleton khi tải).

## Thành công khi
Đăng nhập mỗi vai trò, trong 1 màn biết hôm nay cần làm gì; doc map khớp code.

## Rủi ro
- Thêm gọi API ở dashboard → chậm: tải song song, mỗi khối tự xử lý lỗi.
