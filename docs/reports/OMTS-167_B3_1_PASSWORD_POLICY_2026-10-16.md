# OMTS-167 — Báo cáo B3.1: password policy và schema

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: domain policy và validation schema; chưa dựng form hoặc gọi API

## 1. Kết quả

B3.1 đã hoàn thành với đúng ba quy tắc được SRS UC04 xác nhận:

- ít nhất 8 ký tự;
- có ít nhất một chữ cái;
- có ít nhất một chữ số.

Frontend không tự thêm yêu cầu chữ hoa, chữ thường, ký tự đặc biệt, khoảng trắng hoặc độ dài tối đa. Hai context `standard` và `forced` được khai báo để UI sau này thay đổi bố cục mà không nhân bản policy.

## 2. Cấu trúc

- `password-policy.ts` là nguồn chuẩn cho policy, rule state và hàm đánh giá.
- `change-password-schema.ts` dùng cùng rule state để kiểm tra `newPassword` và `confirmPassword`.
- Field rỗng chỉ nhận thông báo bắt buộc; không bị dồn thêm ba thông báo rule.
- Confirmation mismatch được gắn vào `confirmPassword` để form focus đúng ô cần sửa.
- Password không bị trim hoặc normalize trước khi kiểm tra.

## 3. Edge case phát hiện khi tự review

Phiên bản đầu dùng `password.length`. JavaScript đếm UTF-16 code unit, nên một emoji thường bị tính là hai đơn vị. Chuỗi `Abcde1😀` chỉ có 7 Unicode code point nhưng `.length` trả 8 và có thể qua rule tối thiểu sai.

Cách sửa là dùng `Array.from(password).length`, đếm Unicode code point. Regression test xác nhận chuỗi trên không đạt độ dài. Đây chưa phải grapheme-cluster counting hoàn hảo cho mọi tổ hợp ký tự, nhưng chính xác hơn UTF-16 length và không cần thêm thư viện/normalization có thể làm thay đổi password.

## 4. Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Test riêng B3.1 | 2 files, 13/13 tests đạt |
| Toàn bộ unit test | 12 files, 71/71 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |
| Next.js production build | Đạt, 7/7 static pages generated |

Test bao phủ policy constants/modes, chữ tiếng Việt, Unicode length, từng rule thất bại, confirmation mismatch và field rỗng.

## 5. Phần chưa quyết định

- Standard mode chứng minh bằng current password hay email code ở UI nào.
- Forced mode có yêu cầu nhập lại temporary password hay dùng login context.
- API field names, proof token và session policy sau khi đổi password.
- MSG17/MSG18/MSG19 mapping và mock outcomes thuộc B3.4/B3.5.

Các điểm này không được nhúng vào schema mới vì có thể thay đổi contract hoặc luồng bảo mật.

## 6. Tự review

**4,8/5.** Policy nhỏ, thuần, dùng chung được cho checklist và validation; test bắt được edge Unicode thực tế. Điểm trừ là cách đếm mới ở mức code point chứ chưa phải grapheme cluster, và chưa có UI evidence vì B3.1 cố ý chỉ làm domain/schema.

Kết luận: đủ điều kiện chuyển sang B3.2; `OMTS-167` chưa UI-ready hoặc Jira-ready.
