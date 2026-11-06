# Điều hướng sidebar — 06/11/2026

- API shell dùng anchor nội bộ dẫn tới tải cả document. Đổi sang Next Link, giữ nguyên URL, quyền và trạng thái active. Mock shell vốn đã dùng Next Link.
- Lưu scrollTop của vùng menu desktop bằng sessionStorage; khôi phục khi shell mount. Bản thân điều hướng client giữ nguyên vùng cuộn. Không lưu thông tin tài khoản trong khóa UI này.
- Nút thu gọn đặt cùng hàng thương hiệu, bỏ hàng trống riêng khi expanded. Compact vẫn có nút riêng không đè logo.
- Kiểm tra cấu hình đã lưu: `.env.local` chọn mock; `.env.api.local` chọn API8082/Web3002. Cổng3000 là Next start đang chạy từ trước; thay env cần rebuild/restart cho bản production local.
- Kiểm tra lại sau khi người dùng lưu `.env.local` lúc08:45: key có giá trị, style hm VietMap HTTP200. Đã restart bản API3002 để nạp key. Chưa xác nhận tile/marker render trong browser.
