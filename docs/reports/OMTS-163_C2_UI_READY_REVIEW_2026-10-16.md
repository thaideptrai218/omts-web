# OMTS-163 — C2 UI-ready review

## Phạm vi đã hoàn tất

- C2.1–C2.9: context, contract, schema, route, identifier, MSG15, OTP, cancel old request, password reset, login link và responsive review.
- Không thêm field lịch sử, không liệt kê contact của account, không lộ eligibility.
- Không có developer showcase hoặc mock credential trong UI.

## Chất lượng

- Kiến trúc: Page/Component → Service → Repository → Mock adapter.
- Security: password/OTP/proof không persistent; proof one-time; old challenge bị cancel.
- Anti-enumeration: challenge thật và dummy dùng cùng định dạng request ID; không để prefix nội bộ tiết lộ delivery outcome.
- Accessibility: native radio, label/error association, live feedback, semantic stepper, focus management.
- Responsive: browser-checked 360 px và 1024 px.
- Verification: 128/128 tests, lint, typecheck, build, diff-check đều xanh.

## Điểm chưa hoàn tất và không được che giấu

1. C2.10 chưa thể làm vì chưa có QA API/OpenAPI và public recovery challenge contract.
2. Chuẩn số điện thoại nội địa hay E.164 chưa được nhóm xác nhận; UI không áp regex đoán.
3. Backend phải chứng minh timing/hình dạng response không phân biệt account tồn tại, chưa verified, locked hoặc lỗi provider.
4. Backend phải xác nhận cancel endpoint, proof TTL và việc revoke toàn bộ session sau reset.

## Kết luận

C2 được đánh giá **UI-ready bằng mock, chưa Jira-ready**. Không chuyển `OMTS-163` sang Done trước khi C2.10 và các integration blocker ở trên được xử lý.
