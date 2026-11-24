# Phase T - Truy xuất nguồn gốc: hoàn thiện sau đợt sửa 19/11

Nguồn: `../reports/review-truy-xuat-nguon-goc-2026-11-19.md` (L1-L8, P1-P8). Quyết định: phase-00. **Không** thêm ươm, vật tư.
Công tổng: M. T1-T4 không đổi nghiệp vụ, làm ngay. T5 cần PM.

## T1 Dọn và thống nhất (S)
- Thay `features/invoice-qr/qr-encoder.ts` + `qr-svg.tsx` bằng `QrCodeImage` có sẵn (`features/sales-invoices/qr-code-image.tsx`); xóa 2 file thừa. Nếu chuỗi URL quá dài cho bộ mã cũ (trả null) thì nâng bộ mã cũ, không giữ 2 bộ.
- Q7: xóa `PublicOriginService`, `IPublicOriginQuery`, `PublicOriginQuery`, `PublicOriginView`, đăng ký DI và `PublicOriginTests.cs`; `PublicOriginController.cs` (đang chỉ còn comment) xóa luôn. `dotnet build` sạch.
- Xác nhận Mobile không gọi `/api/origin/` (grep repo `omts-mobile` nếu có trên máy; không có thì ghi chú).

## T2 Lỗi nhỏ còn lại (S-M)
- L5: tìm theo hóa đơn bỏ hóa đơn đã hủy (`LotTraceQuery.cs:25`).
- L6: phiên thả nhiều làn: hiển thị **một lần** theo phiên, liệt kê các làn trong phiên, không lặp số lượng ở từng làn (`trace-backward-panel.tsx:33`).
- L8: ẩn tên/SĐT khách khi người xem không có quyền xem hóa đơn ở **vùng hóa đơn** (`LotTraceBuilder.cs:107-121`), như đang làm với giá.
- P4: sửa chú thích DTO "10 phút" cho khớp thời hạn ký URL thực tế 1 giờ (hoặc giảm còn 10 phút - chọn giảm, ảnh công khai).
- P7: header bảo mật cho `/origin/*` trong `next.config.ts` (`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, CSP cơ bản cho ảnh qua proxy).

## T3 Trang công khai chuyên nghiệp hơn (S-M, không thêm trường mới)
- Q8: logo + ảnh bìa từ hồ sơ HTX qua proxy ảnh đã ký (đang bị `origin-page-fetch.ts:22` xóa).
- Đầu trang: tên sản phẩm + tên HTX (h1), mã hóa đơn xuống dòng phụ; bỏ lặp ngày hóa đơn ở timeline.
- Open Graph/Twitter từ thương hiệu HTX (giữ `noindex`).
- Đổi chữ "thu hồi" (rút thông tin nguồn gốc) thành "đã rút thông tin nguồn gốc" để không nhầm thu hồi hàng.
- Kiểm 360 px bằng headless Chrome: lưới ảnh không tràn ngang.

## T4 Màn nội bộ (M)
- Sơ đồ chuỗi đầu trang trace: **Lô giống → Bè/Chu kỳ → Thu hoạch (kế hoạch, đơn) → Cân tại cảng → Hóa đơn → Khách**, mỗi mắt xích xanh (đủ)/vàng (thiếu)/đỏ (lỗi), bấm để cuộn tới khối. Thêm mắt xích kế hoạch thu hoạch + đơn đặt hàng (nội bộ, dữ liệu đã có).
- Tìm kiếm thêm lọc ngày thu hoạch, bè, sản phẩm; **truy xuất xuôi từ lô giống/NCC** → các lô thu hoạch → hóa đơn → khách (phục vụ thu hồi khi giống lỗi). Backend: mở rộng `LotTraceQuery` hoặc endpoint `GET api/lot-traces/by-seed-lot/{code}`.
- Chi tiết hóa đơn: ảnh QR, "Sao chép liên kết", "In nhãn", cột Lô thu hoạch link sang trace. "Có, kèm QR" mà không lô nào công bố: báo rõ lý do (đã làm, kiểm lại).
- Cảnh báo đầu trace: "Lô đã bán nhưng chưa công bố", "Có khiếu nại đang mở" (đọc claim theo hóa đơn - chỉ hiển thị, không đổi trạng thái lô).

## T5 Cần PM duyệt (chưa làm)
Tóm tắt chất lượng nước trên trang công khai · làm tròn tọa độ bè · chứng nhận gắn vùng/sản phẩm và tính theo ngày thu hoạch · cho mở file chứng nhận công khai · cấp lại QR (BR-TRACE-02 đang cấm) · claim chấp nhận → tạm ngưng lô · nhật ký lượt xem công khai · seed demo có kế hoạch thu hoạch cho 5 lô (hiện `harvestPlan = null`).

## Xong khi
QR quét bằng điện thoại mở đúng trang; trace nội bộ có sơ đồ chuỗi; truy xuất xuôi từ lô giống ra khách; `tsc`/eslint/`dotnet build` sạch; headless 360/1024 không tràn.
