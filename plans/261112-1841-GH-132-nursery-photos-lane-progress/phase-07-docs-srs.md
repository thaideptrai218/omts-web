# Phase 07: Tài liệu, SRS, luồng sử dụng, tóm tắt PM (D)

**Người làm:** Claude (docs). **Ưu tiên:** P2. **Phụ thuộc:** Phase 02 (chốt nội dung), cập nhật nốt sau Phase 06. **Trạng thái:** pending.

## Context
- `docs/reports/FARMING_NURSERY_STEP_SPEC_2026-11-12.md` (mục 4 là danh sách thay đổi SRS), `docs/SRS_DEVIATIONS.md`, `docs/reports/SRS_CHANGE_LOG_HR_2026-11-11.md` (mục G), hợp đồng API nursery, `docs/reports/farming-flow/PART_A/B` (mô tả luồng cũ).

## Yêu cầu
1. Cập nhật `docs/SRS_DEVIATIONS.md` (web) và bản tóm tắt ở backend: bước ươm bắt buộc, ghi số sống sót ước tính, thả giống từ phân bổ (thay GBR-04), BR-CYCLE-07, ảnh bắt buộc 1-3, % làn, bỏ ngày thu dự kiến, thu hoạch không bị chặn theo mục tiêu, nhóm nhân viên cùng thu, ảnh lưu local tạm thời.
2. Mục G của nhật ký chung: ghi từng thay đổi và trạng thái.
3. **`docs/USER_FLOWS.md`** phần Nuôi trồng theo luồng mới (Mua giống → Ươm → Kế hoạch → Thả giống → Nuôi → Thu hoạch → Tổng kết), từng bước: ai làm, trường nhập, ảnh, quy tắc, thông báo, liên kết.
4. **Tóm tắt một trang gửi PM** (thay đổi SRS cần xác nhận, câu hỏi còn mở).
5. Cập nhật báo cáo luồng `farming-flow/PART_B` phần ươm, thả giống, thu hoạch cho khớp bản mới (ghi ngày).

## Files
`docs/SRS_DEVIATIONS.md`, `docs/USER_FLOWS.md` (mới), `docs/reports/SRS_CHANGE_LOG_HR_2026-11-11.md` (mục G), `docs/reports/PM_NURSERY_SUMMARY_2026-11-12.md` (mới), `docs/reports/farming-flow/*`.

## Todo
- [ ] SRS_DEVIATIONS + nhật ký
- [ ] USER_FLOWS Nuôi trồng
- [ ] Tóm tắt PM một trang

## Thành công
Đồng đội đọc hai file (đặc tả + tóm tắt PM) là biết cần sửa gì ở SRS và API; không còn mâu thuẫn giữa các tài liệu.

## Kiểm tra gọn
Không chạy test; kiểm tra liên kết nội bộ bằng công cụ validate docs nếu có.
