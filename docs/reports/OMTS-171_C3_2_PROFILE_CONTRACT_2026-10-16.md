# OMTS-171 C3.2 — Profile domain, schema and service contract

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: domain/schema/service boundary; chưa tạo mock runtime hoặc route `/account`

## 1. Kết quả

C3.2 bổ sung:

- `PersonalProfile` với contact verification state, record version và role/scope summary chỉ đọc;
- candidate email/phone schema có kiểm tra khác giá trị hiện tại;
- phone validator được inject để không tự chốt cú pháp chưa có trong SRS;
- typed outcome cho load, bắt đầu xác minh và save;
- `SavePersonalProfileInput` chỉ nhận display name, record version và verified identifier change;
- repository/service boundary độc lập với mock/HTTP;
- message catalog cho MSG06, MSG10, MSG20, MSG57 và MSG62;
- unit tests cho schema, message formatting và service delegation.

## 2. Cái gì và tại sao

Email/phone change được biểu diễn bằng `{ value, token }`, không phải một string trong form save. Thiết kế này làm trạng thái “đã nhập nhưng chưa xác minh” không thể vô tình vượt qua service boundary.

Username và roles không nằm trong `SavePersonalProfileInput`. Đây là cách chặn chỉnh sửa ở cả UI contract, thay vì chỉ render input `disabled` rồi vẫn gửi field lên backend.

`recordVersion` là opaque string. Frontend không tăng version và không giải mã nó; backend trả version mới sau save, frontend gửi lại đúng giá trị đó ở lần tiếp theo.

## 3. Luồng dữ liệu

```text
load()
  -> PersonalProfile(profile fields + recordVersion)

startIdentifierChange(kind, candidate)
  -> validation/uniqueness/session check
  -> VerificationChallenge hoặc typed rejection

SCR-02 verify
  -> VerificationToken

save(displayName, recordVersion, optional {value, token})
  -> saved(profile + new version)
  -> conflict(MSG06)
  -> invalid change(MSG01/MSG16)
  -> session expired(MSG19)
```

## 4. Giới hạn có chủ ý

- Contract là frontend domain contract, chưa phải HTTP DTO.
- Chưa chọn API path/status code hoặc rowVersion encoding.
- Chưa chọn phone regex.
- Chưa quyết định proof còn dùng được hay không sau conflict reload.
- Role summary chỉ dùng để trình bày; permission gate không đọc nó.

## 5. Lỗi thực tế và cách sửa

Lần chạy đầu:

```text
npm run typecheck
TS2322: Type '{ object_name: string; masked_email?: undefined; } | ...'
is not assignable to type 'MessageParams | undefined'.
```

Vitest vẫn xanh vì đây là lỗi kiểu tĩnh. Toán tử ba ngôi trong test khiến TypeScript tạo union có optional property kiểu `undefined`, xung đột với index signature `string | number` của `MessageParams`.

Đã khai báo rõ biến test là `Record<string, string> | undefined`. Sau sửa:

- profile tests: 2 files, 5 tests pass;
- profile/message targeted tests: 15 tests pass;
- `npm run typecheck`: pass;
- `npm run lint`: pass.

## 6. Defense Q&A

**Tại sao dùng discriminated union cho outcome?**

Mỗi outcome có `status` riêng và chỉ mang dữ liệu hợp lệ cho trạng thái đó. Component phải xử lý rõ saved/conflict/invalid/session-expired, giảm việc dựa vào exception string hoặc field tùy chọn.

**Tại sao record version là string?**

Frontend không cần biết backend dùng số, timestamp hay row-version bytes. Opaque string giữ contract linh hoạt và ngăn client tự tính version.

**Vì sao username không chỉ đặt disabled?**

`disabled` chỉ là ràng buộc giao diện. Loại username khỏi save input tạo ràng buộc kiến trúc: component không có cách hợp lệ để gửi thay đổi username qua profile service.

## 7. Trạng thái

C3.2 hoàn thành và đã kiểm tra. C3 chưa UI-ready; bước tiếp theo là C3.3 mock environment dùng chung verification proof registry.
