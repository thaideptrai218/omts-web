# OMTS-154 C1.2a — Registration schema boundary

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: password policy dùng chung và validation ổn định; phone format vẫn deferred

## 1. Cái gì

Password policy được chuyển từ feature đổi mật khẩu sang `shared/security`. Registration schema kiểm tra method, identifier, password và confirmation. Email dùng parser của Zod; phone gọi validator bắt buộc được inject khi tạo schema.

## 2. Tại sao

Rule “ít nhất 8 ký tự, có chữ và số” thuộc chính sách credential của toàn hệ thống, không thuộc riêng màn đổi mật khẩu. Một nguồn policy tránh trường hợp đăng ký chấp nhận password mà đổi mật khẩu lại từ chối.

SRS không chốt phone nội địa hay E.164. Schema factory làm phần chưa chốt trở thành dependency bắt buộc thay vì nhét một regex tạm vào production code.

## 3. Data flow

Form values đi vào schema. Method `email` gọi email parser; method `phone` gọi `isValidPhoneNumber` từ composition layer. Password đi qua shared rule state; mismatch được gắn vào `confirmPassword`. Schema không normalize hoặc gọi API.

## 4. Giới hạn

Regex `^0\\d{9}$` chỉ tồn tại trong unit test như một validator giả để chứng minh cơ chế delegation. Nó không phải rule OMTS và không xuất hiện trong source production.

C1.2 chưa hoàn tất cho tới khi C1.2b nối validator được nhóm/backend xác nhận.

## 5. Defense Q&A

**Tại sao shared policy không chứa message tiếng Việt?**

Policy trả trạng thái kỹ thuật của từng rule. Mỗi màn quyết định cách trình bày message, trong khi rule cốt lõi vẫn dùng chung.

**Dependency injection ở đây giải quyết điều gì?**

Nó buộc nơi compose schema phải cung cấp chính sách phone cụ thể. Phần chưa chốt không bị che bởi một default quá rộng hoặc quá hẹp.

## 6. Kiểm tra

- Shared password policy giữ nguyên Unicode behavior đã test ở Phase B.
- Email không gọi phone validator.
- Phone luôn ủy quyền cho validator được inject.
- Password rule và confirmation lỗi đúng field.
