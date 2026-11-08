# Đối chiếu #21–#23 và đề xuất đồng bộ — 31/10/2026

Trạng thái: người dùng đã duyệt D1, D2 và D3 trong chat; ghi nhận tiếp tục ngày 02/11/2026. Các quyết định xung đột cũ được thay trong phạm vi dưới đây. Phạm vi: #21@6b7ce1c, #23@51420c6, #22@8078fce (đã force-update từ ac32b0b). Các nhánh xếp chồng theo #19→#21→#23→#22. Chưa áp lên QA3003 hoặc merge develop.

Nguồn: PR/source controller/service/migrations, Jira OMTS-216/218 và SRS V8 (ACCOUNT-07/08, FARM-05, PURCHASE-07/08). Quyết định người dùng tiếp tục ưu tiên hơn SRS/Jira chưa chốt.

## D1 — Vai trò, grant và quyền không gắn vùng (#21)

[Quyết định27/10](WEB_FIXED_ROLES_DECISION_2026-10-27.md): ba role vùng Quản lý vùng/Kế toán/Nhân viên; tên cố định nhưng Owner được sửa quyền, ngừng/khôi phục role. Không tự cấp quyền role Nhân viên.

#21 chỉ có hai role ZONE_MANAGER/ACCOUNTANT. Owner là subject type, có quyền riêng. Matrix chỉ đọc; API ghi role/impact bị gỡ. Role cũ có code LEGACY-* được giữ để xem lịch sử, không được gán/không cấp quyền/không dùng để đăng nhập. Không tự map sang một role có nhiều quyền hơn.

Grant chỉ Effective hoặc Revoked; không còn effectiveFrom/effectiveTo. Role picker gửi code/id ổn định. Theo BR-FARM-08, nghiệp vụ không gắn vùng dùng quyền theo role: Accountant chỉ được gán một vùng vẫn vào thanh toán/nợ NCC; nghiệp vụ có zone tiếp tục đúng vùng. UI vẫn dùng effective functions/scope, không suy quyền từ label.

Các thay đổi matrix có tác động: Manager chỉ xem yêu cầu mua/khiếu nại; tạo/xem/xuất invoice nhưng sửa/hủy do Owner; tạo/xem trả hàng bán; Employee CRUD theo quyền Manager; dashboard chỉ Owner. Accountant xem phiếu nhập/lot trace/supplier, giữ chức năng tài chính và payroll khi backend có API. Functions mới LOT_TRACING/SALES_RETURNS; không mở màn chưa có API.

Rủi ro migration upstream: bỏ ngày/status role có thể làm grant hết hạn, chưa đến ngày hoặc role đã ngừng trở lại hiệu lực. Đề xuất tích hợp **dừng migration nếu gặp các trường hợp đó hoặc duplicate active pair**; giữ bản sao đầy đủ để đối chiếu, không tự mở quyền hay tự thu hồi để làm migration chạy. Chỉ các role seed đúng tên/code được backend mapping theo contract; role lạ không được nâng quyền.

Preflight read-only trên OMTS_QA_INTEGRATION_20261031: có1grant nằm trong nhóm nguy hiểm nêu trên,0duplicate stored-effective pair. Vì vậy không áp nguyên migration #21 lên clone này ngay cả khi đã duyệt matrix: cần quyết định mapping riêng hoặc môi trường kiểm thử tách biệt; không sửa grant để bỏ qua preflight.

D1 đã duyệt: chuyển Web/Mobile sang matrix hai role readonly, adapter grants/permissions mới và UI lịch sử không ngày hiệu lực. Việc tạo/grant mới chỉ mở khi đã kiểm quyền/scope; create/reset Staff secret-free và onboarding email-or-phone vẫn chờ riêng.

## D2 — Catalog thông báo theo type và quyền chỉnh Push (#23)

[WEB-NOTIFY-02 đã duyệt29/10](OPEN_QUESTIONS.md): catalog nhóm từ API, Web sửa InApp/Email/Zalo đủ điều kiện; Push chỉ xem và Mobile quản lý.

#23 thay bằng types[{type,name,mandatory,push}], pushAllowedOnDevice. Mọi thông báo luôn vào inbox; không còn lựa chọn InApp/Email/Zalo. Mandatory luôn Push, NeverPush không hiện switch. Lưu giữ Push ON dù chưa có device, đồng thời trả notice MSG-ACCOUNT-21; không tự đăng ký device trên Web.

Người dùng chọn **cả Web và Mobile chỉnh Push** cho type tùy chọn; type mandatory khóa bật. Quyết định này thay ranh giới Push chỉ xem trên Web của WEB-NOTIFY-02.

Notification inbox thêm messageCode/messageParams nguyên tử để dựng tiếng Việt; relatedRecordId là ID, relatedRecordCode chỉ để hiển thị. Endpoint /open recheck quyền, không đánh đọc; Web gọi /read riêng khi hiển thị. Record đã mất báo MSG-ACCOUNT-22 nhưng giữ thông báo; mất quyền báo403. Nâng cấp phần đọc/hiển thị này không tự mở quyền ghi Push.

Nhánh#20 hiện còn phát WORK_ASSIGNMENT, NEW_ORDER, trader approval, phản hồi/hủy mua và nghỉ phép. Catalog#23 không đăng ký đủ các type này; phải giữ các thông báo của workflow đã duyệt khi giải xung đột, không bỏ lời gọi hoặc cho dispatcher lỗi sau khi đã lưu nghiệp vụ. Đây là bảo toàn luồng hiện hành, không thêm workflow mới.

Migration upstream xóa/reset preferences cũ. Chỉ được thử trên database/files clone có backup; không reset original. Những tùy chọn mới và các type mandatory sẽ theo catalog mới khi D2 được duyệt. Provider QA vẫn Fake; chưa đăng ký thiết bị hoặc deploy Zalo thật.

## D3 — Danh mục mua hàng (#22)

- Input group Seed/RaftMaterial/Other đổi sang Seed/Material/Other. Mọi filter/receipt line cùng mapping; RaftMaterial bị API mới từ chối.
- Tên vật tư unique không phân biệt hoa thường, gồm cả đã ngừng; code duplicate trả field Code, name duplicate field Name và existingId.
- Mọi Seed dùng đơn vị của Seed đầu tiên, gồm bản ngừng dùng. Backend trả seedUnit ở next-code; Web/Mobile điền/khóa Unit khi đã có chuẩn. Group/Unit của item đã dùng vẫn khóa; Code đã dùng được sửa theo contract mới.
- GET farming-input-items/next-code trả mã VTnnn gợi ý, Owner được sửa. Không coi mã gợi ý là giữ chỗ/chắc chắn lưu thành công.
- Item/supplier đã ngừng chỉ đọc; Resume rồi mới sửa/upload certificate. /resume là route mới; /reactivate tương thích một release.
- Supplier otherContacts đổi sang Address và thêm Email tùy chọn; validation500/256ký tự và email hợp lệ. SupplierView bỏ debt; chỉ Owner/Accountant có quyền dùng endpoint debt riêng, không để Manager xem nợ trong detail.
- Receipt/payment/return chưa đổi mô hình ở #22, chỉ đổi group. Không tự làm redesign tiền của các PR PURCHASE sau.
- Xóa chứng nhận NCC vẫn chỉ nhận index, chưa có ID/version nguyên tử: giữ blocker cũ, không mở nút xóa vì #22.

D3 đã duyệt: sửa form/schema/filter/mapping lỗi và next-code/resume; kiểm luồng duplicate, seed unit, used item và discontinued bằng API thật. Không đổi contract phiếu/tiền chưa có trong #22.

Preflight QA hiện tại:0tên vật tư trùng,4Seed cùng đơn vị con. Không có nhu cầu tự sửa đơn vị/số lượng hay đổi tên dữ liệu hiện có để làm migration chạy.

## Phương án kỹ thuật và bảo toàn dữ liệu

Tiếp tục cùng nhánh/PR Web3, Backend25, Mobile5. D1–D3 đã được người dùng duyệt trực tiếp; triển khai adapter/schema/UI theo các quyết định trên. Việc triển khai code không tự bỏ qua preflight hoặc chứng minh QA browser đã qua.

Backend sẽ ghép stack mới vào worktree tích hợp, giải moved DTO/controller và model snapshot, giữ guard legacy payroll của đợt trước. Migration chỉ trên bản sao database/files hiện tại, không down/reset volume. Kiểm grant nguy hiểm/seed units/tên trùng trước; dừng khi không thể giữ trạng thái/ý nghĩa hiện có mà chưa có quyết định mapping.

Giữ G1/G2, không refresh/replay tự động trên Web, không đổi session/OTP/credential, không cấp thêm quyền ngầm. Mobile giữ cơ chế phiên hiện có trong đợt này, không coi build là device acceptance.

Lint/typecheck/test/build và QA theo role trước commit/push; CI xác nhận đúng SHA. Chưa merge develop, không đánh SRS/Jira Done dựa trên màn mock.
