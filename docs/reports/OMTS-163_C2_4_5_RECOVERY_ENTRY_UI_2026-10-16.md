# OMTS-163 — C2.4–C2.5 Recovery entry UI

## Kết quả

Đã dựng route thật `/recover`, stepper ba bước và form nhập định danh. Đây là giao diện sản phẩm, không có showcase, credential mẫu hay chú thích dành cho developer.

Stepper dùng `nav`, `ol` và `aria-current="step"`. Các bước chỉ báo tiến trình, không phải nút bấm, vì người dùng không được nhảy qua bước xác minh. Khi state đổi bước, focus chuyển tới heading hiện tại để người dùng screen reader không bị mất ngữ cảnh.

Form cho người dùng chọn Email hoặc Tin nhắn SMS bằng native radio. Email được kiểm tra cú pháp. Số điện thoại chỉ bắt buộc có giá trị; không áp regex hoặc chuẩn hoá nội địa/E.164 khi nhóm chưa chốt contract. Sau khi submit, UI luôn chuyển sang cùng MSG15 và không nhận các cờ `accountExists`, `verified`, `locked` hay `deliveryFailed`.

## Lỗi thực tế và cách sửa

Lệnh `npm run lint` báo `react-hooks/incompatible-library` tại `watch("channel")`. React Compiler không thể memo hoá an toàn hàm `watch` do React Hook Form trả về, nên component có nguy cơ bị bỏ qua tối ưu hoặc dùng subscription khó kiểm soát. Đã thay bằng `useWatch({ control, name: "channel" })`, là API subscribe field chuyên dụng. Sau sửa, lint và typecheck đều xanh.

## Bằng chứng

- Test stepper và schema identifier xanh.
- Lint/typecheck xanh.
- Browser 360 px: không tràn ngang, `scrollWidth 345 < innerWidth 360`.
- Browser 1024 px: không tràn ngang, `scrollWidth 1009 < innerWidth 1024`.

## Tự đánh giá

Phần UI đủ dùng bằng mock và không tự chốt nghiệp vụ số điện thoại. Hạn chế còn lại là backend phải chịu trách nhiệm kiểm tra phone chính xác cho tới khi nhóm chốt format chung.
