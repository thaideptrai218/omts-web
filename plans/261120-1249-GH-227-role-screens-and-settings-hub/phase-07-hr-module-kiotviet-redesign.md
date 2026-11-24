# Phase 7 — Làm rõ module Nhân sự (nhân viên, phân công, chấm công) theo KiotViet

**Ưu tiên:** Cao · **Rủi ro:** Vừa · **Trạng thái:** Đã có báo cáo khoảng cách, chờ trả lời câu hỏi
**Báo cáo:** [reports/hr-kiotviet-gap-2026-11-20.md](reports/hr-kiotviet-gap-2026-11-20.md) (nguồn: `docs/reports/kiotviet-nhan-vien/`, 251 ảnh)

## Vấn đề chính
- 4 khái niệm chồng nhau "ai làm ở đâu hôm nay": kế hoạch ngày công (backend có, web **không có màn**), phân công, chấm công, tổ làm trong phiếu nuôi trồng (MSG-LABOR-37).
- Tab Phân công và Chấm công cùng dòng khác cột; chỉ xem 1 ngày; 7+ click mỗi bè × việc; không chép từ hôm qua.
- "Vùng làm việc" của nhân viên ≠ "phân quyền vùng" của tài khoản, sửa ở 2 màn.
- Sửa chấm công, duyệt nghỉ chỉ Owner → QLV kẹt (đã duyệt mở ở phase 5).
- Lối vào trùng: `/employees` ≈ `/workspace/employees`, loại công việc 4 chỗ, thiết lập chấm công 2 chỗ, việc quan trọng giấu trong "⋯".

## Màn đề xuất
- **QLV:** "Lịch làm việc vùng" (lưới tuần người × ngày, chép tuần trước, thêm nhanh thời vụ); "Chấm công hôm nay" (nhóm theo tổ/bè, màu trạng thái, vào/ra cả tổ, khối "chưa ra từ hôm qua").
- **Owner:** checklist thiết lập 6 bước có khóa thứ tự (thêm bước "Vùng & Quản lý vùng").
- **Kế toán:** 1 trang chỉ đọc: trạng thái kỳ lương + chi phí nhân công theo vùng/bè/loại việc.

## Lát cắt (theo thứ tự) — giao Codex `gpt-6.1-sol`, Claude review
| # | Lát | Đụng | Giao |
|---|---|---|---|
| 7.1 | Dọn lối vào trùng, đưa "Đổi việc", "Duyệt yêu cầu" ra ngoài "⋯" | web | Codex |
| 7.2 | Màn "Chấm công hôm nay" (gộp tab "Nhân viên nội bộ" về cùng luật với các tab khác) | web | Codex |
| 7.3 | Mở sửa chấm công/duyệt nghỉ cho QLV (= phase 5) | backend | Claude |
| 7.4 | Lưới tuần "Lịch làm việc vùng" (đọc) | web | Codex |
| 7.5 | Chép tuần trước (không thêm nhanh thời vụ — D6) | web | Codex |
| 7.6 | Endpoint phân công theo khoảng ngày (tùy chọn tạo hàng loạt) | backend | Claude |
| 7.7 | Checklist thiết lập Owner (bỏ bước lương — D4) | web | Codex |
| ~~7.8~~ | ~~Trang Kế toán lương~~ — hoãn (D4) | — | — |
| 7.9 | Tab lịch trong hồ sơ nhân viên | web | Codex |

Đã trả lời: câu 2 (lương) hoãn, 3 không, 4 = D5, 6 = có (D8), 8 = mobile không đụng (D7). Còn mở: 1, 5, 7.

Mỗi lát: brief riêng (file sửa, tiêu chí, test file), chạy `codex exec -m gpt-6.1-sol` trong worktree/branch hiện tại, chỉ test file liên quan + `tsc` + eslint; Claude review trước khi báo bạn. Không commit/push.

## Câu hỏi mở (từ báo cáo)
1. Kế hoạch ngày công có hiện cho QLV ("việc Owner giao xuống" đầu lịch vùng) hay chỉ trong luồng thu hoạch/yêu cầu mua?
2. Lương chỉ theo giờ (đơn giá/giờ/loại việc). Có cần theo sản phẩm (lồng/khay) hay theo ngày công?
3. QLV được tạo nhân viên thời vụ ngay trong lịch vùng?
4. QLV sửa chấm công lùi bao xa: hôm nay/hôm qua, hay tới khi chốt lương?
5. Lý do bắt buộc khi "Vào làm cả tổ" là luật backend hay chỉ web? Bỏ được khi giờ vào = bây giờ?
6. Hiển thị vùng làm việc (nhân viên) và phân quyền vùng (tài khoản) chung một chỗ?
7. BHXH, thuế TNCN có trong phạm vi SRS không?
8. Màn chấm công QLV cần chạy tốt trên web 360 px hay chấm công hiện trường chỉ ở app mobile?
