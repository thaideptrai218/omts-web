# Bài 03 — Nested layout và ranh giới xác thực

## 1. Vấn đề cần giải quyết

Các màn xác thực của OMTS có cùng mục đích và thường cần chung một bố cục: nội dung tập trung, chiều rộng vừa phải và không có application sidebar. Nếu mỗi page tự lặp lại toàn bộ bố cục, code khó giữ nhất quán và thay đổi giao diện phải sửa nhiều nơi.

Nested layout giải quyết việc dùng chung khung giao diện cho một nhánh route mà không biến nó thành layout của toàn bộ ứng dụng.

## 2. RootLayout khác AuthLayout như thế nào?

Cây render của `/login` hiện là:

```text
RootLayout
  └─ AuthLayout
       └─ LoginPage
```

`RootLayout` nằm tại `src/app/layout.tsx`. Đây là layout cao nhất và chịu trách nhiệm tạo `<html>`, `<body>`, font cùng metadata mặc định.

`AuthLayout` nằm trong `(auth)`. Nó chỉ bao quanh các page thuộc nhóm xác thực. Vì phía trên đã có RootLayout nên AuthLayout không được tạo thêm `<html>` hoặc `<body>`; nó chỉ trả về phần giao diện nằm bên trong body.

## 3. `children` đến từ đâu?

AuthLayout nhận:

```tsx
{ children }: { children: React.ReactNode }
```

`React.ReactNode` là kiểu tổng quát cho nội dung React có thể render. Với URL `/login`, App Router tạo `LoginPage` rồi truyền kết quả render của page vào vị trí `{children}` trong AuthLayout.

Lập trình viên không gọi `AuthLayout(LoginPage)` bằng tay. Việc lồng page vào layout được App Router thực hiện từ cấu trúc thư mục.

## 4. Vì sao layout vẫn là Server Component?

Trong App Router, page và layout mặc định là Server Component. AuthLayout hiện chỉ tạo HTML/CSS và render `children`; nó không cần state, effect, event handler hoặc browser API.

Do đó file không có `'use client'`. Giữ layout ở server giúp:

- giảm JavaScript gửi xuống trình duyệt;
- giữ ranh giới client nhỏ;
- cho phép các phần tĩnh được render sớm;
- tránh biến toàn bộ nhánh auth thành client module graph không cần thiết.

Sau này form đăng nhập cần state, submit handler và React Hook Form. Khi đó form có thể là một Client Component nhỏ được AuthLayout/ LoginPage render. Không cần biến cả layout thành Client Component chỉ vì một phần con có tương tác.

## 5. Route `/login` được tạo thế nào?

```text
src/app/(auth)/login/page.tsx
```

- `(auth)` là route group nên không xuất hiện trong URL.
- `login` là thư mục route bình thường nên tạo segment `/login`.
- `page.tsx` làm cho route có thể truy cập.

Kết quả là `/login`, không phải `/auth/login`.

## 6. Metadata của page

LoginPage export:

```tsx
export const metadata: Metadata = {
  title: "Đăng nhập | OMTS",
};
```

Next.js dùng Metadata API để tạo tiêu đề tài liệu phù hợp cho route. Ta không viết thẻ `<title>` thủ công trong JSX. Metadata của page có thể bổ sung hoặc ghi đè metadata chung từ RootLayout.

## 7. Accessibility trong placeholder

`section` dùng `aria-labelledby="login-title"`, còn heading có `id="login-title"`. Mối liên hệ này giúp công nghệ hỗ trợ biết heading nào đặt tên cho khu vực xác thực.

`h1` được dùng cho tiêu đề chính của page. Dù đây mới là placeholder, semantic HTML vẫn được thiết lập đúng từ đầu để tránh phải sửa lại cấu trúc accessibility khi thêm form.

## 8. Những gì cố ý chưa làm

Placeholder chưa có form vì các phần sau phải được đối chiếu SRS/Figma và contract backend:

- định danh đăng nhập là số điện thoại, email hay username;
- trường bắt buộc và validation;
- nội dung lỗi/message catalog;
- post-login verification gate;
- session và refresh-token flow.

Việc dựng một form “trông hợp lý” trước khi xác nhận có thể tạo UI sai nghiệp vụ, dù code vẫn chạy.

### Quyết định identifier đã được xác nhận

`WEB-AUTH-01` chốt rằng login identifier có thể là username, số điện thoại đã xác minh hoặc email đã xác minh. Staff có phone chưa verified ở lần đầu phải dùng username cùng temporary password, sau đó bị chặn tại phone-verification gate.

Chi tiết response contract của gate vẫn được hoãn tới trước khi tích hợp API thật. Foundation route/layout không cần giả lập tên field backend khi contract chưa chốt.

## 9. Câu hỏi bảo vệ

### Tại sao AuthLayout không có `<html>` và `<body>`?

Vì nó là nested layout và đã được RootLayout bao ngoài. Chỉ root layout cao nhất tạo cấu trúc tài liệu HTML.

### Tại sao không thêm `'use client'` vào AuthLayout?

Layout hiện không dùng state, effect, event hoặc browser API. Giữ nó là Server Component làm giảm JavaScript phía client; phần form tương tác sau này có thể có client boundary riêng.

### AuthLayout có tự kiểm tra đăng nhập không?

Không. Trong bước hiện tại nó chỉ là ranh giới bố cục. Session và redirect cần thiết kế riêng theo contract bảo mật đã được xác nhận.

### Tại sao placeholder đã quan tâm accessibility?

Semantic HTML là nền của component, không phải phần trang trí thêm sau. Thiết lập heading và tên khu vực đúng từ đầu giúp UI dễ mở rộng mà không phá cấu trúc hỗ trợ screen reader.

## 10. Trạng thái hiện tại

- `(auth)` có nested layout riêng.
- `/login` có placeholder tiếng Việt và metadata riêng.
- Lint đạt, không có warning.
- `next typegen` và TypeScript đạt.
- Production build tạo đúng `/` và `/login`; cả hai hiện là static route.
- Chưa có form, state, API, session hoặc redirect.
