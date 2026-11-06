# OMTS-159 — Báo cáo B2.5a: post-login gate landing

> Ngày kiểm tra: 16/10/2026 (Asia/Saigon)
>
> Phạm vi: hiển thị và chặn post-login gate; chưa hoàn tất đổi mật khẩu hoặc xác minh điện thoại

## 1. Nguồn và quyết định phạm vi

- [OMTS-159](https://welterial.atlassian.net/browse/OMTS-159) yêu cầu sau login phải chuyển tới forced password change hoặc phone verification gate và chỉ mở menu được phép sau khi qua gate.
- [OMTS-167](https://welterial.atlassian.net/browse/OMTS-167) sở hữu security form/forced-change mode; forced mode không được hiển thị navigation nghiệp vụ.
- [OMTS-150](https://welterial.atlassian.net/browse/OMTS-150) định nghĩa SCR-02 nhận challenge, masked recipient và `onVerified(token)`.
- [OMTS-149](https://welterial.atlassian.net/browse/OMTS-149) backend verification API vẫn ở trạng thái To Do.

SRS UC02 xác nhận password change xảy ra trước phone verification nếu cả hai cùng cần. UC02 branch 3a cũng yêu cầu trader nhập số điện thoại, còn staff xác nhận số đã nhập hoặc thay số khác, rồi mới gọi UC08. Vì login result hiện chưa có recipient/challenge và contract hoàn tất gate chưa được xác nhận, B2.5a chỉ triển khai boundary chắc chắn.

## 2. Thay đổi

- Thêm type `PostLoginGate` gồm password-change và phone-verification outcome.
- Thêm type guard `requiresPostLoginGate` và test đủ bốn login outcome.
- `LoginExperience` giữ gate trong state và thay form bằng `PostLoginGatePanel`.
- Panel nêu rõ loại gate, xác nhận chức năng nghiệp vụ vẫn khóa và cho phép dùng tài khoản khác.
- Khi panel xuất hiện, focus chuyển vào heading để người dùng bàn phím/screen reader nhận biết thay đổi lớn của màn hình.

Không có route, token, recipient, OTP challenge hoặc API completion nào được tự tạo. `AuthProvider` chỉ ghi session cho `access-granted` như trước.

## 3. Kiểm tra trình duyệt

| Scenario | Kết quả |
| --- | --- |
| `staff-first-login / demo123` | Hiện “Đổi mật khẩu tạm thời”; focus ở heading; URL vẫn `/login` |
| Quay lại | Form login được dựng mới, không giữ password cũ |
| `trader-needs-phone / demo123` | Hiện “Xác minh số điện thoại” và MSG67; focus ở heading; URL vẫn `/login` |
| Console | Chỉ có React DevTools/HMR info; không có warning/error ứng dụng |

Viewport trình duyệt hiện tại rộng 1127 px và không overflow. Bài kiểm tra 360 px chưa được tính là đạt trong bước này vì CUA không hỗ trợ thay viewport bằng `window.resizeTo`; sẽ kiểm tra lại ở B2.7 bằng công cụ viewport phù hợp.

## 4. Bằng chứng tự động

| Kiểm tra | Kết quả |
| --- | --- |
| Focused auth tests | 2 files, 19/19 tests đạt |
| Toàn bộ unit test | 10 files, 58/58 tests đạt |
| ESLint | Đạt, không warning |
| Next typegen + TypeScript | Đạt |
| Next.js production build | Đạt, 7/7 static pages generated |

## 5. Lỗi thực tế và chẩn đoán

Lệnh đọc source ban đầu thử mở `verification-service.instance.ts` nhưng file không tồn tại. Đây không phải file bị mất: harness verification tại thời điểm kiểm tra tự compose service với mock repository tại component; repo chưa có application-level verification service instance. Harness này sau đó đã bị xóa khỏi product source. Phát hiện vẫn củng cố việc không tự nối phone gate bằng một singleton mới khi completion contract chưa rõ.

Trong browser QA, lời gọi `tab.getByRole` thất bại vì CUA đặt locator dưới `tab.playwright`, còn thao tác accessibility tree nằm trực tiếp trên `tab`. Kiểm tra được chạy lại bằng `tab.setValue`, `tab.click` và AX node ID. Thử `window.resizeTo` cũng thất bại vì hàm này không tồn tại trong evaluate sandbox; vì vậy báo cáo không nhận 360 px là đã kiểm tra.

## 6. Tự review

**4,5/5.** Lỗi UX “submit rồi đứng im” đã được loại bỏ, state và accessibility boundary rõ, application shell vẫn bị khóa. Điểm trừ là panel mới chỉ là landing state, chưa phải hành trình hoàn chỉnh; B2.5b/c phụ thuộc các contract và UI của `OMTS-167`, `OMTS-158`, `OMTS-149`.

Kết luận: B2.5a đạt; B2.5 tổng thể chưa đạt và `OMTS-159` chưa UI-ready/Jira-ready.
