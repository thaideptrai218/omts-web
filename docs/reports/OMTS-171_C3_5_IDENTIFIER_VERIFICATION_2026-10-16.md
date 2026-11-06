# OMTS-171 C3.5 — Verified email and phone candidates

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)

## 1. Kết quả

- Display name dùng form validation riêng.
- Email/phone có action đổi độc lập, không biến current value thành input dễ ghi đè.
- Candidate dialog kiểm tra required/different/current và email syntax.
- Profile service kiểm tra current/duplicate/session rồi tạo shared SCR-02 challenge.
- Email dùng MSG62; delivery error dùng MSG04.
- OTP đúng tạo candidate `{ value, token }` trong React memory.
- Card hiển thị rõ `Đã xác minh, chờ lưu`; current value chưa đổi.
- Save thành công cập nhật profile/version, consume proof, hiển thị MSG10 và đồng bộ display name lên app header.
- Invalid proof xóa candidate tương ứng và dùng MSG16.
- Verification dialog đóng giữa chừng sẽ cancel request hiện tại.

## 2. Luồng tương tác

```text
Thay đổi email/phone
  -> nhập candidate
  -> startIdentifierChange
  -> SCR-02 challenge
  -> OTP đúng
  -> verified candidate chờ lưu
  -> Save(profile version + candidate token)
  -> current contact mới + version mới
```

Current value và verified candidate cùng xuất hiện trước save. Cách này giúp người dùng biết giá trị nào đang hoạt động và giá trị nào mới chỉ hoàn tất OTP.

## 3. Focus và keyboard

Lần browser review đầu, native dialog focus nút đóng thay vì input candidate. `autoFocus` không đủ vì `showModal()` quản lý focus sau render. Shared Dialog hiện đặt focus sau khi dialog mở bằng explicit ref, kèm `data-dialog-initial-focus` fallback. Review lại xác nhận:

- candidate dialog focus `Email mới`;
- verification dialog focus `Mã xác minh`;
- nút Save disabled khi không có thay đổi;
- sau OTP đúng, Save được enable.

## 4. Phone validation có chủ ý chưa chốt

Phone candidate hiện chỉ yêu cầu có giá trị ở frontend screen. Schema vẫn nhận injected phone validator; khi nhóm chốt domestic/E.164 contract, validator thật được cắm vào mà không viết lại component. Mock/backend boundary vẫn chịu trách nhiệm từ chối invalid/duplicate value.

Đây là giới hạn được ghi rõ, không phải tuyên bố phone format đã hoàn tất.

## 5. Browser evidence

Browser đã đi qua toàn bộ happy path bằng mock:

1. mở dialog đổi email;
2. nhập `new-owner@omts.test`;
3. nhận challenge masked `ne***@omts.test`;
4. nhập OTP mock đúng;
5. thấy `Đã xác minh, chờ lưu` trong khi current email vẫn là email cũ;
6. save và thấy card chuyển sang email mới cùng toast MSG10.

## 6. Bằng chứng chất lượng

- full suite: 32 test files, 145/145 tests pass;
- lint: pass;
- typecheck: pass;
- production build: pass, có route `/account`;
- `git diff --check`: pass.

## 7. Defense Q&A

**OTP đúng có thay email ngay không?**

Không. OTP tạo proof cho candidate. Save mới gửi proof cùng record version để backend áp dụng atomically và ghi audit.

**Tại sao đóng dialog lại cancel request?**

UC08 quy định khi người dùng đổi hoặc bỏ địa chỉ nhận giữa chừng, code cũ không được tái sử dụng. Cancel làm trạng thái đó rõ ràng và giảm request còn treo.

**Tại sao display name trên header đổi ngay sau save?**

Profile response sau save là nguồn mới nhất. Auth state chỉ cập nhật phần presentation `displayName`; token, permission và session không bị thay đổi.

## 8. Trạng thái

C3.5 hoàn thành bằng mock. C3.6 còn thiếu quyết định về việc giữ hay hủy verified candidate/proof sau conflict reload; chưa đánh dấu UI-ready toàn bộ C3.
