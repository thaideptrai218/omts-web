# OMTS-154 C1.3a — Registration method selector

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: component lựa chọn phương thức; chưa mount route/form

## 1. Cái gì

Tạo `RegistrationMethodSelector` hiển thị hai lựa chọn Email và Số điện thoại dưới dạng card gọn, một cột trên màn nhỏ và hai cột từ breakpoint `sm`.

## 2. Tại sao dùng radio

Hai lựa chọn loại trừ lẫn nhau. Native radio đã có semantic, thứ tự Tab và hành vi phím mũi tên do trình duyệt cung cấp. Nếu dùng hai button rồi tự giả lập trạng thái selected, component phải tự viết lại accessibility behavior và dễ sai.

Card, icon và màu selected chỉ là presentation quanh input radio. `fieldset` và `legend` nói rõ hai radio thuộc cùng câu hỏi.

## 3. Hoạt động

Parent truyền `value` và `onChange`. Component không tự chọn email hoặc phone, không tự map channel và không giữ registration draft. Khi parent pending, thuộc tính `disabled` trên fieldset khóa toàn bộ nhóm theo native HTML.

## 4. Giới hạn

Component chưa được mount vào `/register`. Route và submit vẫn chờ C1.2b để không đưa một phone validator giả vào product flow. Không có route showcase hoặc chú thích developer.

## 5. Defense Q&A

**Vì sao radio được ẩn thị giác?**

Input chỉ được ẩn bằng `sr-only`, không bị `display: none`, nên vẫn tồn tại trong accessibility tree và nhận focus. Label card phản ánh trạng thái bằng các `peer-*` style.

**Vì sao component controlled?**

Registration form phải là nguồn state duy nhất. Controlled value giúp reset, validation và pending state không bị lệch với state nội bộ của selector.

## 6. Kiểm tra

- Render đúng hai radio có cùng name.
- Chỉ lựa chọn hiện tại có `checked`.
- Disabled áp dụng ở cấp fieldset.
- Lint, typecheck và regression test phải tiếp tục đạt.
