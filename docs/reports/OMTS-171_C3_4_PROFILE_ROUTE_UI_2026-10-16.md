# OMTS-171 C3.4 — Account route and profile layout

> Ngày thực hiện: 16/10/2026 (Asia/Saigon)

## 1. Kết quả

- Thêm protected route `/account` với title `Hồ sơ cá nhân | OMTS`.
- Thêm mục `Tài khoản` luôn hiện với mọi authenticated account, không phụ thuộc zone-role permission.
- Account chip trên header là link có accessible name tới `/account`.
- Thêm route-level loading boundary và service-level skeleton dùng chung.
- Có load error + retry; session-expired phát MSG19 qua shared session channel.
- Layout tách vùng editable và account metadata chỉ đọc.
- Username, role và scope không được render thành form control.

## 2. Cấu trúc UI

Màn dùng một cột thao tác chính và một aside account metadata. Ở màn hẹp, hai phần xếp dọc; ở màn rộng, aside nằm bên phải. Email/phone được trình bày thành card riêng để trạng thái verified và candidate chờ lưu dễ nhìn.

Không có development showcase, mock credential, context selector hay chú thích kỹ thuật trong product UI.

## 3. Loading ở hai tầng

`account/loading.tsx` là route fallback của Next.js, giúp navigation có nội dung tức thời trước khi client segment sẵn sàng. `ProfileExperience` tiếp tục dùng cùng skeleton khi chờ profile service.

Hai skeleton không có nghĩa hai business step; chúng che hai khoảng chờ kỹ thuật khác nhau nhưng cùng một visual, nên người dùng không thấy layout nhảy.

## 4. Lỗi thực tế

### React lint: set state đồng bộ trong effect

Effect gọi một async function nhưng function đó set loading trước `await`, nên ESLint báo `react-hooks/set-state-in-effect`. Build vẫn pass. Initial load đã có state loading, vì vậy effect được đổi sang gọi Promise trực tiếp và chỉ set state trong callback bất đồng bộ; cờ `isActive` tránh commit sau unmount.

### Next.js instant navigation insight

Dev Tools báo `/account` bị dropped khỏi instant-navigation validation. Route-level `loading.tsx` đã được thêm để có fallback khi chuyển trang, nhưng log dev sau đó xác nhận insight vẫn còn và `/dashboard` hiện hữu cũng gặp cùng cảnh báo.

Đối chiếu tài liệu Next.js cục bộ cho thấy validator cần nhìn thấy shell/fallback trong lúc render route. `AppSessionShell` hiện giữ toàn bộ `children` khi auth state phía client còn `loading`, nên page segment bị loại trước khi validator quan sát được nội dung route. Sửa triệt để liên quan server session/SSR guard hoặc chủ động opt-out `instant = false`; cả hai là quyết định kiến trúc session đã được project rules yêu cầu xác nhận trước. C3 không tự thay đổi ranh giới này.

## 5. Browser evidence

- Navigation và header mở được `/account`.
- Initial skeleton chuyển sang profile content.
- Route title đúng.
- 360 px: document `scrollWidth = 345`, `innerWidth = 360`.
- 1024 px: document `scrollWidth = 1009`, `innerWidth = 1024`.

## 6. Defense Q&A

**Vì sao mục Tài khoản không có permission key?**

UC05 là self-service của mọi actor đã đăng nhập. Zone-role permission quyết định chức năng nghiệp vụ, không quyết định quyền xem chính hồ sơ của account hiện tại.

**Vì sao vẫn phải có backend authorization?**

Route/client navigation chỉ cải thiện UX. Backend phải lấy account từ session và không chấp nhận client truyền account id tùy ý để sửa hồ sơ người khác.

## 7. Trạng thái

C3.4 hoàn thành. Route đã production-facing và responsive; QA API/SSR security boundary vẫn là release gate chung.
