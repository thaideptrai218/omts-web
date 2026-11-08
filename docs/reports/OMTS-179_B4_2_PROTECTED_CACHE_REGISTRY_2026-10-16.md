# OMTS-179 — Báo cáo B4.2: protected-cache cleanup registry

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: cơ chế đăng ký và dọn cache bảo vệ phía client; chưa nối final 401 và chưa thêm cache nghiệp vụ giả

## 1. Kết quả

Đã tạo registry độc lập thư viện cho dữ liệu cache chỉ được phép tồn tại trong phiên đăng nhập. Mỗi feature sau này có thể đăng ký một cleanup bằng key ổn định và hủy đăng ký khi không còn sở hữu cache đó.

Luồng logout hiện chạy theo thứ tự:

1. auth state chuyển sang anonymous để protected UI biến mất ngay;
2. toàn bộ protected-cache cleanup được gọi;
3. repository mới thực hiện remote session invalidation.

Repo hiện chưa có TanStack Query hoặc protected store thực tế. Vì vậy registry chưa đăng ký no-op hoặc cache giả.

## 2. Quyết định kỹ thuật

Registry dùng `Map` vì key phải duy nhất và thứ tự đăng ký cần xác định được khi test. Đăng ký trùng bị báo lỗi thay vì âm thầm ghi đè cleanup cũ; nếu ghi đè, một feature có thể làm dữ liệu của feature khác không được xóa.

`clearAll()` chạy best-effort: một cleanup ném lỗi được ghi vào `failedKeys`, nhưng các cleanup còn lại vẫn chạy. Đây là cách an toàn hơn cho logout vì lỗi ở cache Profile không được ngăn cache permissions hoặc dữ liệu nghiệp vụ khác bị xóa.

## 3. Phạm vi chưa làm

- Chưa nối query library vì source chưa có query cache.
- Chưa lưu token/cookie vì contract session chưa chốt.
- Chưa xử lý final 401; đây là B4.3.
- Chưa thiết kế offline remote invalidation retry; đây là B4.4 và cần backend contract.

## 4. Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Test registry + local-first logout | 2 files, 6/6 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |

Test bao phủ thứ tự cleanup, tiếp tục sau lỗi, unregister và duplicate key.

## 5. Tự đánh giá

**4,7/5.** Boundary đủ nhỏ, không phụ thuộc cache library và có failure isolation. Điểm còn thiếu là chưa có cache nghiệp vụ thật để xác nhận integration thực tế; đây là trạng thái đúng với source hiện tại, không phải lý do để bịa adapter.
