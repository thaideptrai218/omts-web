# OMTS-159 — Báo cáo B2.3a: password field

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: hành vi input đăng nhập; chưa thêm link tới route chưa tồn tại

## 1. Kết quả

B2.3a đã hoàn thành. Form đăng nhập có `PasswordField` dùng lại được với nút “Hiện/Ẩn” nằm trong control. Nút hỗ trợ chuột và bàn phím, cập nhật `aria-label`/`aria-pressed`, không thay đổi hoặc lưu riêng giá trị password.

Identifier giữ helper đã xác nhận theo `WEB-AUTH-01`; đồng thời tắt tự viết hoa và spellcheck để tránh trình duyệt làm thay đổi username, phone hoặc email.

## 2. Cấu trúc code

- `FormField` nhận `endAdornment` để hỗ trợ action ở cuối input mà không nhân bản label, hint, error và ARIA wiring.
- `PasswordField` sở hữu duy nhất state `isVisible` và đổi input type giữa `password`/`text`.
- `LoginForm` dùng `PasswordField`; React Hook Form vẫn giữ giá trị và validation như trước.

Không có password nào được ghi vào `localStorage`, log hoặc state dùng chung. State mới chỉ mô tả cách hiển thị ký tự.

## 3. Responsive và accessibility evidence

| Kiểm tra | Kết quả |
| --- | --- |
| Toggle bằng click | Đạt |
| Toggle bằng phím Space | Đạt |
| Accessible label | Đổi đúng “Hiện mật khẩu”/“Ẩn mật khẩu” |
| Giá trị sau toggle | Được giữ nguyên |
| Touch target | 48 × 44 px |
| Viewport 360 px | Card 328 px, document 360 px, không overflow |
| Viewport 1024 px | Card 464 px, document 1024 px, không overflow |
| Browser console | Không warning/error |
| Toàn bộ test | 9 files, 43/43 tests đạt |
| Lint/typecheck | Đạt |
| Production build | Đạt với Next.js 16.4.0 |

Trong lần đo đầu, toggle cao 40 px. Đây không phải lỗi chức năng nhưng chưa thân thiện bằng mục tiêu chạm 44 px cho người dùng ít quen công nghệ. Class đã được đổi từ `min-h-10` sang `min-h-11`; lần đo sau xác nhận chiều cao 44 px.

## 4. Phần được hoãn có chủ ý

B2.3b chưa thực hiện:

- Blueprint xác nhận UC03 dùng `/recover`, nhưng page C2 chưa tồn tại. Hiện chưa render link để tránh đưa người dùng tới 404.
- SRS xác nhận người xem có thể đi tới UC40 không cần đăng nhập, nhưng repo chưa có route canonical cho SCR-24. Frontend không tự đặt `/traceability` hoặc giả vờ `/` đã là trang tra cứu.
- Link đăng ký Trader cũng chỉ nên render khi route `/register` có destination hợp lệ.

Đây là giới hạn triển khai, không phải thay đổi luồng nghiệp vụ. B2.3 chỉ được đánh dấu hoàn thành khi các link có page đích hợp lệ.

## 5. Tự review

Điểm tự đánh giá: **4,5/5**.

- Component nhỏ, có thể dùng lại và không can thiệp dữ liệu form.
- Keyboard, ARIA, touch target và hai breakpoint đều có bằng chứng trực tiếp.
- Không tạo URL hoặc placeholder giả.
- Điểm trừ: B2.3 tổng thể chưa hoàn thành vì route phụ chưa sẵn sàng; chưa có component test tự động do repo chưa cài DOM testing stack. Browser QA đang là bằng chứng cho hành vi này.

Kết luận: B2.3a đạt; bước tiếp theo nên xử lý route foundation của `/recover` theo C2 hoặc chuyển B2.4/B2.5 trước và quay lại link sau.
