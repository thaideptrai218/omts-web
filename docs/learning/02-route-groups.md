# Bài 02 — Route group và ranh giới trang công khai

## 1. Vấn đề cần giải quyết

OMTS Web sẽ có ba loại trải nghiệm khác nhau:

- Trang công khai, chẳng hạn trang truy xuất nguồn gốc từ QR.
- Màn hình xác thực, chẳng hạn đăng nhập hoặc xác minh tài khoản.
- Khu vực nghiệp vụ chỉ dành cho người có phiên và quyền phù hợp.

Nếu tất cả page nằm lẫn trực tiếp dưới `src/app`, ứng dụng vẫn chạy nhưng rất khó đặt layout, provider và cơ chế kiểm tra phù hợp cho từng nhóm. Route group giúp chia source theo mục đích mà không đưa tên kỹ thuật đó vào URL của người dùng.

## 2. Next.js tạo URL từ thư mục như thế nào

Với thư mục thông thường, tên thư mục trở thành một URL segment:

```text
src/app/public/page.tsx → /public
```

Với tên nằm trong ngoặc tròn, Next.js coi đó là route group và loại tên nhóm khỏi URL:

```text
src/app/(public)/page.tsx → /
```

Ngoặc tròn không phải cách trang trí tên file. Nó là một file-system convention được App Router hiểu và xử lý.

## 3. Thay đổi vừa thực hiện

Trang gốc được chuyển từ:

```text
src/app/page.tsx
```

sang:

```text
src/app/(public)/page.tsx
```

JSX của component `Home` được giữ nguyên. Đây là cách kiểm thử có kiểm soát: chỉ thay đổi vị trí route, không đồng thời thay giao diện. Nếu kết quả build thay đổi bất thường, phạm vi nguyên nhân rất nhỏ và dễ chẩn đoán.

## 4. Luồng khi người dùng mở `/`

```text
Trình duyệt yêu cầu /
  → App Router bắt đầu tại src/app
  → RootLayout được chọn làm layout chung
  → tên (public) bị bỏ qua khi so khớp URL
  → page.tsx bên trong khớp với /
  → Home trả về JSX
  → JSX được truyền vào children của RootLayout
  → Next.js tạo HTML gửi cho trình duyệt
```

`children` không phải dữ liệu do component Home tự gửi thủ công. App Router tạo cây route rồi truyền page phù hợp vào layout.

## 5. Route group không phải access control

Tên `(public)` chỉ nói với đội phát triển rằng nhóm này dành cho trải nghiệm công khai. Tương tự, đặt một page vào `(app)` không làm page đó tự yêu cầu đăng nhập.

Access control sau này cần ba lớp khác nhau:

1. Session bootstrap xác định người dùng đã có phiên hợp lệ hay chưa.
2. Permission gate quyết định route hoặc chức năng có phù hợp quyền và zone scope không.
3. Backend kiểm tra token và quyền cho từng API; frontend không phải hàng rào bảo mật cuối cùng.

## 6. Hai giới hạn quan trọng từ tài liệu Next.js 16

### Xung đột URL

Hai group không được cùng tạo một URL:

```text
(public)/about/page.tsx → /about
(app)/about/page.tsx    → /about
```

Next.js không thể chọn page nào nên type generation hoặc build sẽ báo xung đột.

### Nhiều root layout

Nếu xóa layout cấp `src/app` và đặt các root layout riêng trong từng group, điều hướng giữa hai root layout có thể tạo full-page load. OMTS hiện giữ một RootLayout chung; các layout group sau này chỉ lồng bên trong, nên bước này chưa tạo vấn đề đó.

## 7. Cách kiểm chứng

Sau khi chuyển file, cần chạy:

```text
npm run lint
npm run typecheck
npm run build
```

Kết quả quan trọng nhất của build là bảng route vẫn chứa `/` và không xuất hiện `/public`. `next typegen` trong lệnh typecheck cũng phải sinh route types theo vị trí file mới.

## 8. Câu hỏi bảo vệ

### Tại sao không dùng thư mục `public` bình thường?

Vì thư mục route bình thường sẽ tạo URL `/public`. OMTS chỉ cần tên `public` để tổ chức source, nên dùng `(public)` để tên nhóm không tham gia URL.

### Đặt trang vào `(app)` có đủ để bảo vệ trang không?

Không. Route group chỉ tổ chức route và layout. Ứng dụng vẫn cần kiểm tra session/permission, còn backend phải thực thi authorization trên API.

### Vì sao giữ nguyên JSX khi chuyển file?

Để chỉ thay đổi một biến số là vị trí route. Cách này giúp xác định lỗi dễ hơn và chứng minh URL không đổi do route group, không phải do một thay đổi giao diện khác.

## 9. Trạng thái hiện tại

- Trang `/` đã nằm trong `(public)`.
- Lint đạt với không warning.
- `next typegen` và `tsc --noEmit` đạt; route metadata đã phản ánh vị trí file mới.
- Production build đạt và chỉ liệt kê `/` cùng `/_not-found`; không có `/public`.
- Không xuất hiện lỗi stale validator vì type generation được chạy trước TypeScript.
- Chưa có `(auth)` hoặc `(app)`.
- Chưa có login, session, protected route hoặc permission gate.
