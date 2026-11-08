# OMTS-179 — Báo cáo B4.3: final 401 và session-expiry flow

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: liên kết final 401/MSG19 với local cleanup và protected-route redirect; chưa quyết định refresh/cookie contract

## 1. Kết quả

Đã thêm session-expiry channel tại shared boundary. Khi API client nhận response 401 cuối cùng, nó:

1. tạo message MSG19;
2. publish session-expiry event;
3. gọi observer tùy chọn của request composition;
4. vẫn reject `ApiError` status 401.

`AuthProvider` đăng ký listener một lần. Nếu đang authenticated, provider chuyển anonymous, gọi cùng protected-cache registry và phát toast MSG19. `AppSessionShell` vốn đã chặn protected children khi anonymous nên tự replace về `/login`.

## 2. Kiểm soát trường hợp biên

- Provider bỏ qua session-expiry event khi chưa authenticated, tránh biến lỗi của request công khai thành thông báo hết phiên.
- Status ref được cập nhật đồng bộ trước React render; các 401 đồng thời sau sự kiện đầu bị bỏ qua, không tạo nhiều toast.
- Một listener của channel ném lỗi không ngăn listener bảo mật khác chạy.
- Request 401 vẫn reject; side effect logout không biến request thất bại thành thành công giả.
- Session expiry không gọi remote logout vì server đã từ chối session; cách này tránh request thừa hoặc vòng lặp 401.

## 3. Ranh giới chưa chốt

“Final 401” hiện là kết quả mà API boundary nhận được. Bước refresh trước 401, cookie/token ownership và phân biệt public/protected HTTP adapter phải được chốt ở QA integration. B4.3 không tự thêm refresh hoặc token storage.

## 4. Bằng chứng tập trung

| Kiểm tra | Kết quả |
| --- | --- |
| API client + channel + logout/cache | 4 files, 20/20 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |

Full regression và production build được ghi trong báo cáo đóng Chặng B.

## 5. Tự đánh giá

**4,6/5.** Luồng 401 đã dùng cùng cleanup boundary, không ghép router vào HTTP client và có chống xử lý lặp. Chưa thể đạt Jira ready vì refresh/session contract và QA API chưa có; server-side route protection vẫn là release blocker riêng.
