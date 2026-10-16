# OMTS-179 — Báo cáo B4.1: local-first logout

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: logout UI, local auth cleanup, protected client rendering và browser Back; chưa có QA API/offline retry

## 1. Kết quả

Đã nối hành động đăng xuất thật vào application shell:

- desktop: nút ở cuối sidebar, vẫn có accessible name khi sidebar thu gọn;
- mobile: nút ở cuối drawer, cạnh thông tin tài khoản;
- UI gọi `useAuth().logout()`, không gọi mock/repository trực tiếp;
- provider chuyển auth state sang anonymous trước khi chờ repository;
- `AppSessionShell` không render protected children khi auth loading hoặc anonymous;
- sau remote success hoặc failure, route được replace về `/login`.

Không tạo route/harness hoặc panel giải thích developer.

## 2. Vì sao local cleanup chạy trước

UC07 yêu cầu khi mất mạng, ứng dụng vẫn xóa session phía thiết bị và không cho Back hiển thị protected data. Nếu chờ API logout thành công mới xóa state, một request treo/lỗi sẽ giữ dashboard trên màn hình.

Helper `performLocalFirstLogout` cố định thứ tự: clear local trước, invalidate remote sau. Test chứng minh local clear vẫn chạy khi remote promise reject.

## 3. Tránh race logout–login

Phiên bản đầu redirect ngay khi state thành anonymous. Tự review phát hiện người dùng có thể mở form login trong lúc remote logout cũ còn chạy; với cookie session, request cũ có thể hoàn tất sau login mới và gây race.

Bản sửa vẫn ẩn protected content ngay, nhưng giữ màn trạng thái “Đang chuyển về trang đăng nhập...” cho tới khi remote logout resolve/reject. Chỉ sau đó mới `replace('/login')`. Như vậy form login mới không hoạt động song song với request logout cũ.

## 4. Browser QA

| Hành vi | Kết quả |
| --- | --- |
| Desktop login → logout | Nút sidebar hoạt động; trong lúc remote mock chạy chỉ hiện status, sau đó về `/login` |
| Browser Back sau logout | Không quay lại dashboard; entry đã được replace |
| Mở trực tiếp `/dashboard` sau logout | Tự về `/login`, dashboard không xuất hiện trong DOM |
| Mobile 360 px | Logout nằm cuối drawer; target 284.8 × 44 px |
| Horizontal overflow 360 px | `scrollWidth = innerWidth = 360` |
| Password trong accessibility snapshot | Được redacted |

## 5. Lỗi và finding thực tế

### Đọc sai đường dẫn toast provider

Lệnh đọc ban đầu tìm `src/components/feedback/toast-provider.tsx` và PowerShell báo không tồn tại. Import thật chỉ tới `src/components/ui/toast-provider.tsx`. Đây là lỗi dò source; không có file nào bị sửa. Bài học là theo import/`rg --files` thay vì đoán cấu trúc thư mục.

### Dev overlay che nút desktop

Click logout desktop lần đầu không thay đổi UI vì badge Next.js “Insight” nằm đè lên phần cuối sidebar trong dev. Sau khi thu badge, cùng nút hoạt động bình thường. Production build không chứa overlay này; đây không phải lỗi hit target của sản phẩm.

### Next.js Instant Navigation Insight

Dev server báo: route `/dashboard` “Could not validate that a segment in your UI has instant navigation” và page segment bị dropped khỏi validation. Tài liệu cục bộ của Next 16.4 giải thích Cache Components yêu cầu static shell không rỗng khi kiểm tra instant navigation.

Nguyên nhân hiện tại là client auth guard không render page children khi session đang loading/anonymous. Đây là lựa chọn an toàn hơn việc để protected UI lóe lên, nhưng đồng thời phản ánh release blocker đã biết: server chưa sở hữu session để render/redirect protected route đúng từ request đầu tiên.

Không thêm `instant = false` để giấu warning. Production build vẫn đạt; finding được giữ cho bước chốt cookie/session và server-side route protection.

## 6. Bằng chứng tự động

| Kiểm tra | Kết quả |
| --- | --- |
| Test mục tiêu | 3 files, 15/15 tests đạt |
| Toàn bộ unit test | 15 files, 84/84 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |
| Production build | Đạt, 6/6 static pages |
| `git diff --check` | Đạt |

## 7. Tự đánh giá

**4,6/5.** Local cleanup, responsive placement, focus semantics và race logout–login đã được xử lý rõ. Điểm chưa đạt Jira ready là chưa có query cache thật để clear, chưa có offline invalidation retry và server-side route guard vẫn chờ auth contract. Jira `OMTS-179` không được chuyển trạng thái.
