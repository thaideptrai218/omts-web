# Ghi nhận quyết định chờ/kiểm tra lại phiên

Ngày27/10/2026. Repo `omts-web`, nhánh hiện tại `feature/OMTS-132-web-foundation`.

> Cập nhật sau snapshot tài liệu này: Duy Thái đã đồng ý G1 (contract/fixture trước) và chặn API login trên browser thiếu Web Locks. [Báo cáo G1.1](WEB_G1_1_LEDGER_CONTRACT_2026-10-27.md) ghi 9 test reference model; chưa có cookie/Redis/Web Locks runtime. Các câu “chờ chốt” bên dưới mô tả thời điểm trước phản hồi, không phải trạng thái quyết định hiện tại. API/refresh vẫn tắt.

## Đã chốt

Duy Thái trả lời trực tiếp câu hỏi về quy tắc login cạnh tranh: “Đồng ý quy tắc chờ và kiểm tra lại phiên”. Decision WEB-API-08b được chuyển từ Open sang Decided về hành vi: một lượt login đang chờ/browser, tab khác chờ rồi đọc lại phiên; mất phản hồi không tự gửi lại credentials. Quyết định giữ phiên hợp lệ/đổi account phải logout trước không đổi.

## Đã làm trong lượt này

- Cập nhật decision register, đề xuất gốc, project context và chia nhỏ b4.1a/b4.1b trong plan. Chỉ đánh dấu phần hành vi đã chốt; b4 tổng thể vẫn mở.
- Viết [thiết kế G1 để review](../decisions/WEB_LOGIN_COORDINATION_PROTOCOL_PROPOSAL.md): Web Locks phía browser; cookie HttpOnly điều phối riêng; ledger Redis kiểm attempt/generation; bootstrap, publish và từ chối SID cũ; các trường hợp crash/lease/response cookie muộn cùng bảng kiểm chứng.
- Nêu rõ cookie điều phối không tự xác thực hoặc cấp lại SID; generation/CAS không ngăn browser ghi cookie cũ. SID cũ phải bị server từ chối, còn UX gián đoạn/recovery vẫn phải test và duyệt.
- Chưa chốt cookie/capability fallback, TTL hoặc cơ chế logout offline. Không biến quyết định hành vi thành phê duyệt cả giao thức.

Nguồn kỹ thuật đã đối chiếu: [W3C Web Locks](https://www.w3.org/TR/web-locks/), [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/). Các nguồn xác nhận phạm vi khóa browser và giới hạn lease; G1 là đề xuất áp dụng riêng cho OMTS, chưa được nguồn ngoài hoặc tests chứng minh đúng.

## Kiểm tra và giới hạn

Lượt27/10 chỉ sửa tài liệu; không sửa code session/cookie/Redis hoặc UI, không đổi env, không gọi backend, không cài certificate. Các thay đổi source W3.2 chưa commit từ26/10 được giữ nguyên. Không chạy lại full tests/build cho thay đổi tài liệu;1.566 PASS/31 Redis SKIP và24 HTTP assertions thuộc bằng chứng26/10, không phải kết quả mới27/10.

Đã kiểm diff whitespace và các link local được thêm; bài học93 ở thư mục ignored. Không commit/push/merge hoặc đổi trạng thái Jira trong lượt này.

Theo `AGENTS.md`, thay cơ chế session/cookie cần trình phương án và xác nhận trước. Hai điểm review kế tiếp là cookie/giao thức G1 và hành vi khi browser thiếu Web Locks; chưa triển khai chúng trong lúc chờ trả lời. API/refresh thật vẫn tắt.
