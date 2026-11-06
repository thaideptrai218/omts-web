# VietMap và vị trí chuông thông báo — 06/11/2026

- Nguyên nhân build: SDK `@vietmap/vietmap-gl-js@6.0.1` đã cài nhưng package không khai báo entry gốc. README SDK yêu cầu import `@vietmap/vietmap-gl-js/dist/vietmap-gl`. Sửa cả import type và dynamic import; Node đã resolve được entry thực tế.
- Fetch Mobile và tìm VietMap trên các remote branch: có trên `feature/acs-zalo-linking`; cấu hình đọc `VITE_VIETMAP_API_KEY` từ môi trường. Không tìm thấy giá trị key trong các file môi trường local của Mobile/Mobile integration đã kiểm tra. Web tiếp tục dùng `NEXT_PUBLIC_VIETMAP_API_KEY`; không ghi key vào source hoặc báo cáo.
- Thêm icon chuông riêng; chuyển nút từ controls sidebar sang góc phải header nội dung trên desktop. Mobile giữ header, popup neo dưới chuông thay vì tọa độ phụ thuộc chiều rộng sidebar. Giữ preview 5 thông báo, số chưa đọc, liên kết chi tiết và xem tất cả.
- TypeScript `npx tsc --noEmit` đạt. Kiểm tra render bản đồ có tile vẫn cần key và quyền domain VietMap.
- `npm run build` và `npm run typecheck` đạt. Lint phát hiện liên kết HTML nội bộ ở workforce; đã chuyển sang Next Link và chạy lại lint. Chưa kiểm tra giao diện trực tiếp trong browser trong lượt này.
