# Bản đồ, CI và GitGuardian — 06/11/2026

## Đối chiếu Mobile

Đọc `src/features/farming/components/raft-map.tsx` và `location-map.tsx` từ Mobile integration, đối chiếu nhánh remote `feature/acs-zalo-linking`.

| Nội dung | Web / Mobile |
| --- | --- |
| Nền bản đồ | VietMap hm vệ tinh |
| Tọa độ | `[longitude, latitude]`, không ép null thành0, kiểm finite và giới hạn |
| Dữ liệu | Vùng/bè từ API, không dựng vị trí minh họa |
| Khung nhìn | Fit bounds, max zoom17, resize khi container đổi |
| Tương tác | Mobile theo một vùng và bấm nhãn mở bè; Web directory nhiều vùng, chọn ghim rồi mở hồ sơ |
| Chọn vị trí | Mobile có picker kéo ghim; Web directory hiện chỉ đọc, chưa có picker tương đương |

Chưa thể gọi hai client giống hoàn toàn. Không tự mở quyền sửa tọa độ qua bản đồ directory.

## AbortError

SDK6.0.1 hủy request style khi `map.remove()`. Promise catch của SDK có thể phát error sau khi Style đã tách khỏi Map. Evented không có listener sẽ console.error. Bổ sung listener trên Style đang dispose, chỉ bỏ qua AbortError và báo thông báo chung nếu đóng bản đồ gặp lỗi khác. Không chặn console/window toàn cục, vẫn remove map để giải phóng tài nguyên.

## Check GitHub hiện tại

- CI41858842018 thất bại tại test:13ca; chưa chạy tới build. Đang đối chiếu bộ test local hiện tại, một số lỗi nhãn đã sửa từ các lượt trước.
- GitGuardian126674739160:11occurrence trong91commit lịch sử. Metadata trỏ vào mock/test; cần chủ repo xác nhận giá trị giả lập trên dashboard, không thể suy ra secret production chỉ từ detector generic.
- Finding IDs:38252611 (mock-auth và mock-review-flows),38275826/38275825 (change-password-schema.test),38314033 (mock-provisioning),38314032 (mock-account-management),39141309 (session-hydration.contract.test),39233651 (api-auth-client.test),39272682/39273084 (api-session-runtime.integration.test),39272681 (verification/flow.integration.test).
- Gitleaks của PR đã đạt. `.env.local` bị gitignore, key VietMap local không đưa vào Git.
- Sửa tip commit không loại occurrence lịch sử. Giữ nguyên GitGuardian/gitleaks, không thêm blanket allowlist hoặc rewrite/force-push lịch sử. Theo yêu cầu trước, chủ repo xử lý dashboard GitGuardian. Không bảo đảm check này xanh trước khi finding được phân loại/xử lý.

## Kết quả kiểm tra local

- Bộ đầy đủ trước khi hoàn tất sửa test:3017ca,2962đạt,7lỗi,48skip. Cả7lỗi đã được xử lý: nhãn UI cũ, endpoint sản phẩm mới `/api/products`, truy vấn `action=list` hợp lệ cho ca kiểm tra thay đổi session. Giữ assertion401 và không phát dữ liệu sau đổi phiên.
- Chạy lại các nhóm liên quan:25ca UI đạt (24ca đạt trong lượt đầu, ca xác nhận bỏ nháp đạt trong lượt sau),52ca server/dashboard/provisioning đạt. Không bỏ test để làm xanh; chưa chạy lại toàn bộ3017ca sau sửa.
- Lint, typecheck, production build đạt. Bước cuối CI `test:session-pages` phát hiện thêm nhãn login cũ; sửa thành “Đăng nhập hệ thống”, chạy lại63assertionđạt.
- Chưa chạy lại browser close/reopen để xác nhận AbortError đã hết; TypeScript/build kiểm tra được adapter cleanup. Chưa commit/push hoặc cập nhật trạng thái check GitHub.
