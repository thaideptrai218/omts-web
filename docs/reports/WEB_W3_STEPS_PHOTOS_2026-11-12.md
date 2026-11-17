# WEB W3 - Thả giống, thu hoạch, sự cố làn, kế hoạch, ảnh các bước (12/11/2026)

Nhánh `feature/OMTS-132-web-login-farming`. Nguồn: đặc tả nursery mục 10.2-10.6, hợp đồng API mục 8 (B2).

## Đã làm

- **PhotoPicker dùng chung** (`src/components/form/photo-picker.tsx`, `photo-compression.ts`, `photo-contracts.ts`, `photo-gallery.tsx`): 1-3 ảnh, xem trước, xóa, đếm n/3, nén phía trình duyệt (cạnh dài <= 1600 px, chất lượng 0,82, giữ hướng EXIF), lỗi tiếng Việt nêu số ảnh. Màn Ươm (`nursery-api`) dùng lại bản chung; bản nén riêng đã thành re-export.
- **Thả giống**: multipart POST/PUT (`seeding-record`/`seeding-correct`); chu kỳ từ ươm không chọn lô giống, hiện "Còn X trên Y mảnh đã phân bổ", chặn cứng khi vượt, 409 `NURSERY_SEEDING_ABOVE_ALLOCATION` có câu tiếng Việt; % từng làn (mặc định 100) ngay trong form; ảnh 1-3 bắt buộc; chu kỳ cũ (không qua ươm) vẫn dùng form chọn lô giống.
- **Thu hoạch**: ảnh 1-3 bắt buộc khi ghi mới, `lanePercents` là MỘT trường chuỗi JSON, sửa lô giữ `keepPhotoKeys` (tối đa 3, lô cũ không ảnh để 0).
- **Sự cố làn**: báo hỏng gửi multipart (`reason` bắt buộc, ảnh 1-3).
- **Kế hoạch nuôi**: BFF `cycles-photo-upload.ts` (bắt đầu chu kỳ multipart, `plan-photos`); đã bỏ ngày thu dự kiến khỏi form, đọc, hành trình và tổng kết; ảnh kế hoạch hiển thị ở tab Kế hoạch (`cycle-plan-photos.tsx`).
- **Nhật ký chăm sóc**: ảnh tùy chọn tối đa 3, dùng PhotoPicker chung.
- **Tổng kết chu kỳ / Sản lượng nuôi**: khối Ươm (`cycle-nursery-summary.tsx`, bước Ươm trong hành trình), cột "mảnh vào ươm", "hao hụt ươm"; số suy từ đếm tay ghi "ước tính".
- **Thư viện ảnh** trong chi tiết lô thu, thả giống, nhật ký; ảnh cũ thiếu vẫn hiển thị (schema `stepPhotosSchema` chấp nhận thiếu `photos`, tự chuẩn hóa `id`/`key`).
- **Lỗi 400 theo trường**: `farmingFieldError` hiện lỗi `Photos`, `LanePercent` (kèm "còn N%") đúng ô.
- **BFF**: `farming-record-upload.ts` gom kế hoạch multipart thả giống/thu hoạch/nhật ký; `appendFarmingFields` đóng `lanePercents` thành một chuỗi JSON.
- **Quyết định bổ sung của chủ**: tạo chu kỳ thủ công đã gỡ khỏi màn Chu kỳ (nút "Bắt đầu chu kỳ nuôi" và form bắt đầu); thay bằng ghi chú "Chu kỳ mới được tạo khi hoàn tất ươm" kèm liên kết `/farming/nursery`. Chu kỳ cũ có nhãn "Không qua ươm". Xem, sửa, đóng chu kỳ giữ nguyên; `cycle-editor.tsx` giữ lại.

## Kiểm chứng

- `tsc --noEmit`: sạch trong phạm vi W3 (còn lỗi ở `purchasing-v2/receipts-list-screen.tsx` của tác vụ khác).
- Test thuần mới: `photo-compression.test.ts`, `record-lane-percents.test.ts`; cập nhật test cũ đã lỗi thời (`cycle-journey`, `cycle-model`, `lane-incidents-plan`, `resource-http`).
- Không chạy build, không chạy dev server, chưa kiểm thủ công trên trình duyệt.

## Chưa làm / hạn chế

- Chưa sửa % làn sau khi đã ghi (PUT `lanes/{n}/progress`) ngoài phạm vi W1.
- Form sửa lô thu hoạch không đổi `lanePercents` (hợp đồng: bỏ qua thì giữ % cũ).
- Chưa kiểm với backend B2 thật; chưa kiểm 360 px và 1024 px bằng trình duyệt.

## Giả định

- `photos[]` đọc có thể chỉ có `id` hoặc chỉ có `key`; web dùng cái nào có.
- Sửa thả giống gửi `keepPhotoIds` chỉ khi đổi ảnh; bản ghi cũ không ảnh không bắt thêm ảnh.
- BFF chuyển `hint` của lỗi 400 để hiện câu tiếng Việt; hint không có chữ Việt bị bỏ qua ở UI.
- Chu kỳ tạo từ ươm không có ảnh kế hoạch riêng (dùng ảnh hoàn tất ươm).
