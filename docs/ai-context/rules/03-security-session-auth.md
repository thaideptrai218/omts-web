# 03 — Bảo mật, phiên và xác thực

Chạm vào lưu phiên, refresh token, ranh giới SSR/CSR, bảo vệ route, payload quyền hoặc caching: **trình bày đề xuất và chờ xác nhận** trước khi chọn thiết kế.

## Kiến trúc BFF (WEB-API-01, 23–25/10/2026)
- Trình duyệt chỉ giữ SID mờ trong cookie HttpOnly; token nằm ở server.
- Redis là kho chạy thật; RAM chỉ cho test, **không** có fallback RAM.
- Keyring nhiều phiên bản lấy từ cấu hình server: khóa active ghi dữ liệu mới, khóa cũ để đọc. Không commit khóa, không sinh khóa ngẫu nhiên mỗi lần chạy.

## Cookie, CSRF, thời hạn (WEB-API-07, 24/10/2026)
- Cookie phiên: HttpOnly, Secure trên HTTPS, SameSite=Lax, host-only, Path=/, tiền tố `__Host-` trên HTTPS. Dev HTTP loopback cần cấu hình tường minh.
- CSRF: Origin khớp chính xác, header `X-OMTS-Request: web`, Fetch Metadata nếu có, BFF cùng origin, CORS đóng.
- Hạn phiên BFF không vượt min(hạn access, hạn refresh) khi refresh đang tắt.
- Refresh trực tiếp đang **tắt** (WEB-API-02); chính sách retry/idempotency chưa thống nhất với backend.

## Đăng nhập
- WEB-API-08: đã có phiên BFF hợp lệ thì login trả về đích tương ứng; đổi tài khoản phải đăng xuất trước, không gọi backend, không ghi cookie.
- WEB-API-08b/08c (G1): mỗi trình duyệt một lần đăng nhập đang chờ; tab khác chờ rồi kiểm tra lại phiên; cookie điều phối riêng + sổ Redis. Bắt buộc Web Locks; thiếu thì chặn đăng nhập API và báo cập nhật, không fallback âm thầm sang RAM/localStorage. Phản hồi bị mất không tự gửi lại mật khẩu.

## Xác minh OTP (G2, duyệt 29/10/2026)
- Proof mã hóa trong Redis, gắn context/session/purpose, có CAS và TTL.
- Trình duyệt chỉ nhận flow ID mờ và metadata an toàn.
- Liên hệ đã xác minh ở trạng thái "chờ Lưu" đến khi bấm Lưu; Hủy giữ nguyên liên hệ đã lưu.
- Ghi tên và liên hệ là hai lần ghi backend riêng: báo thành công một phần trung thực, giữ phần nháp còn lại, không giả rollback.
- Không có DevInbox trong sản phẩm.

## Bí mật
- Không commit thông tin xác thực, chuỗi kết nối, bí mật OTP hay file `.env`. Không in chúng ra log/báo cáo.
- Gitleaks chặn PR chứa bí mật. `.gitleaksignore` chỉ là danh sách false-positive đã duyệt, ghim vào một commit/đường dẫn/rule/dòng; phát hiện mới vẫn bật.
- GitGuardian đang hoãn: chủ repo xử lý lịch sử. Không bypass, không viết lại lịch sử, không báo là đã sửa.
- Fixture test phải sinh mật khẩu lúc chạy, không viết cứng.
- Web từ chối grant tùy chỉnh chỉ-OwnRecords khi backend không ép phạm vi người tạo.
- Server-only/serialization boundary có script test riêng (`test:boundary`, `test:serialization`).
