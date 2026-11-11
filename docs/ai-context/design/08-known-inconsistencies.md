# 08 — Chỗ chưa nhất quán (cần quyết định)

Phát hiện khi quét ngày 09/11/2026. Không tự sửa khi chưa được duyệt.

1. **Shell**: giao diện thật là menu ngang; `app-shell.module.css`, `use-sidebar-expansion.ts`, `sidebar-account.tsx` gần như chết. `docs/WEB_NAVIGATION_UX_UPGRADE_PLAN.md` và bản `DESIGN.md` đầu tiên mô tả sidebar. → Xóa code chết và cập nhật tài liệu?
2. **Hai bảng màu**: token teal `#086f78` đối chọi với shell xanh `#315a96`/`#305eb1`/`#dbe3ed` hard-code, cộng xám xanh lá của sidebar/bảng. Báo cáo `WEB_BLUE_THEME_HALLMARK_REVIEW_2026-10-25` từng chuyển sang xanh `#075985`, rồi bị trả về teal. → Bảng nào là chuẩn? Đưa hex shell vào token?
3. **`--omts-radius-dialog` (14px) không dùng**: `Dialog` dùng `rounded-card` (10px). → Dùng token hay xóa?
4. **Không có dark mode**; tài liệu cũng không nhắc. → Ngoài phạm vi?
5. **Không có token z-index/breakpoint**; CSS feature dùng ~20 giá trị breakpoint khác nhau. → Chốt thang (vd 360, 640, 960, 1024)?
6. **`success` = `info` = `primary`** (cùng `#086f78`) nên toast thành công trông giống toast thông tin. Có chủ ý không?
7. **Thiếu component dùng chung**: pill cảnh báo, màn từ chối quyền, trạng thái offline/syncing/success.
8. **Breadcrumb**: không có; chỉ có strip `contextNav` cho nuôi trồng. Có cần không?
9. **Hai bộ trường form**: `FormField` (`text-sm` semibold) và `Field`/`Select` của `operations/ui.tsx` (`text-xs` medium muted). → Thống nhất?
10. **Logo**: ảnh webp lấy từ thư mục Downloads của người dùng. Có logo chính thức/SVG không?
11. **Font**: một số tài liệu còn ghi Geist là font chính; thực tế là Be Vietnam Pro.
12. **Khoảng cách**: thang `--omts-space-*` gần như không dùng.
13. **Chiều rộng nội dung**: token `88rem` vs shell ngang 1440px cứng.
14. **QA đáp ứng**: shell không có media query riêng cho 360/1024; chỉ kiểm bằng trình duyệt.
