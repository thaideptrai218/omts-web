# Phase 06: Web thả giống, thu hoạch, sự cố, tổng kết, ảnh (W3)

**Người làm:** **Codex GPT-6.1 sol, reasoning high** (fallback Claude). **Ưu tiên:** P1. **Phụ thuộc:** Phase 02, 03, 04. **Trạng thái:** pending.

## Context
- Đặc tả mục 3.4, 3.6, 10.2 đến 10.6. Mã hiện có: `cultivation-api/records-seeding-form.tsx`, `records-harvest-form.tsx`, `harvest-*`, `rafts-api/lane-incident-form.tsx`, `cycles-api/cycle-close-panel.tsx`, `cycle-plan-tab.tsx`, `cycle-editor.tsx`, `harvest-yield/*`, `farming-management`.

## Yêu cầu
1. **Thành phần tải ảnh dùng chung** `PhotoPicker` (1-3 ảnh): xem trước, xóa, đếm 1/3, JPEG/PNG, **nén phía trình duyệt** (cạnh dài ≤ 1600 px, chất lượng ~0,82) trước khi gửi, thông báo lỗi nêu số ảnh; dùng ở mọi bước bắt buộc ảnh.
2. **Thả giống:** chọn nguồn từ phân bổ đợt ươm (chu kỳ từ ươm: không chọn lô giống; hiện "Còn X trên Y mảnh đã phân bổ", chặn cứng khi vượt); **nhập % từng làn** ngay trong form (mặc định 100); ảnh 1-3 bắt buộc; chu kỳ cũ vẫn dùng form cũ (có chọn lô giống).
3. **Thu hoạch:** ảnh hiện trường 1-3 bắt buộc; nhập % từng làn thu; giữ số lồng thập phân, kg ước tính, nhóm nhân viên, gắn yêu cầu mua (chọn từ `orders[]`, mặc định yêu cầu đã chấp nhận), chọn nhiều làn và hoàn tất nhiều làn.
4. **Sự cố làn:** ghi chú bắt buộc (khi nào, làn nào, hỏng thế nào) + ảnh 1-3 bắt buộc; sửa làn (vật tư kho) và khôi phục như cũ.
5. **Kế hoạch nuôi** (tạo chu kỳ không từ ươm): ảnh 1-3 bắt buộc; **bỏ ô ngày thu dự kiến** ở form, đọc và tổng kết.
6. **Nhật ký chăm sóc:** ghi chú và ảnh tùy chọn (tối đa 3); vật tư tùy chọn.
7. **Tổng kết chu kỳ** và **Sản lượng nuôi**: khối Ươm (mã đợt, mảnh vào, sống sót ước tính, hao hụt ước tính %), cột "mảnh vào ươm", "hao hụt ươm".
8. Hiển thị ảnh các bước (thư viện nhỏ trong chi tiết bản ghi, xem lớn).

## Files
`src/features/cultivation-api/**`, `cycles-api/**`, `rafts-api/lane-incident-*`, `harvest-yield/**`, thành phần ảnh mới trong `src/components/form` hoặc `farming-management`, BFF (`src/server/farming`, `src/server/operations/cultivation-records-plan.ts`) cho `photos`, `lanePercents`.

## Steps
1. `PhotoPicker` + hàm nén (hàm thuần có test).
2. Thả giống, thu hoạch, sự cố, kế hoạch: ảnh và % theo hợp đồng.
3. Bỏ ngày thu dự kiến; tổng kết và sản lượng khối ươm.
4. Hiển thị ảnh trong chi tiết.
5. eslint thư mục đổi, `tsc` một lần, test hàm thuần.

## Thành công
Không thể lưu bước quan trọng khi thiếu ảnh (thông báo rõ); nhập % làn trong form lưu đúng và hiển thị trên cột làn; tổng kết có khối ươm.

## Rủi ro
Nén ảnh làm lệch EXIF/hướng: giữ hướng đúng; hợp đồng đổi: schema dung sai, đối chiếu với backend thật bằng GET.

## Kiểm tra gọn
eslint + `tsc` một lần + test hàm thuần; không đợt test dài.
