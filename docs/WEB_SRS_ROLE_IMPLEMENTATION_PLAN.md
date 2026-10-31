# Hoàn thiện Web theo vai trò và SRS — 28/10/2026

Theo yêu cầu mới, SRS và quyết định đã chốt xác định chức năng; Jira phục vụ phân công/phụ thuộc, không giới hạn phần frontend được làm. Web-first, mobile vẫn tạm dừng. Không bật API/refresh đang chờ, không tự sửa SRS/Jira/backend. Bản mock hoàn chỉnh của một lát chưa phải nghiệm thu API.

## Đợt thực hiện hiện tại

| Bước | Thay đổi cụ thể | Điều kiện kiểm tra |
| --- | --- | --- |
| UX1 | Sidebar desktop dùng grid chung với nội dung; hover hoặc focus mở, rời cả hai mới thu | Test state, keyboard; đo cạnh sidebar không vượt cạnh nội dung ở360/1024/desktop |
| UX2 | Icon riêng cho nhân viên, account, role, HTX, vùng và dashboard | SVG cùng nét/kích thước, aria-hidden; nhãn nút/link vẫn đầy đủ |
| UX3 | Ngày/tháng/năm tiếng Việt ở birthday, ngày nghỉ và grant dates | Parser/formatter ngày nhuận; giữ ISO trong service; input sai không biến mất, min/max/ngày UTC+7 giữ nguyên |
| Z1 | Đọc UC15/SCR-11, entity/status/BR và backend zones/licenses | Ghi quyền Owner ghi/Manager xem đã chốt; đối chiếu phiên bản nguồn, không tự cấp thêm quyền |
| Z2 | Contract zone, schema và service/repository | ID ổn định khác code/name; code trùng, tọa độ, diện tích, version; field errors rõ |
| Z3 | Nguồn vùng dùng chung thay fixture rải rác | Rename giữ ID/grants; accounts/employees/filter/role impact/dashboard dùng tên mới |
| Z4 | Danh sách vùng có search/status và popup hồ sơ | Loading/empty/error/forbidden; dữ liệu giới hạn theo vùng được cấp |
| Z5 | Owner tạo/sửa vùng và xác nhận thay đổi | Manager không thấy action ghi, service cũng chặn; mã trùng báo đúng ô, giữ bản nháp và không tạo trùng |
| Z6 | Ngừng dùng/khôi phục | MSG11 nếu còn bè đang dùng; không xóa vùng/grants/lịch sử; dùng version mới |
| Z7 | Giấy phép trong hồ sơ vùng | Đã chốt lưu vùng trước, bổ sung giấy tờ sau; số/ngày/phạm vi/file, lịch sử gia hạn và trạng thái theo ngày |
| Z8 | Ghép quyền/menu/dashboard và profile labels | Quyền dựa capability + zone ID, không dựa tên vai trò; Owner toàn HTX, Manager chỉ vùng được cấp |
| R1 | Tự review, hồi quy, lint/typecheck/build/HTTP và browser | Không tràn360/1024, sidebar không che nội dung; ghi phần đã kiểm/phần còn chờ |
| R2 | Báo cáo và learning local | Guide/README tiếng Anh; bài học tiếng Việt ignored; không merge develop |

## Phạm vi rộng hơn theo SRS

**Trạng thái đợt này:** UX1–UX3 và Z1–Z8 đã triển khai trong phạm vi mock/màn vùng nêu trên; R1 có kiểm chứng trong báo cáo, R2 đã cập nhật guide và bài121 local. Z1 chưa xác nhận tương đương toàn văn SRS22/10; tích hợp backend/QA vẫn tách riêng. Không dùng trạng thái này để đánh dấu mọi UC hoặc Jira item hoàn tất.

Theo ma trận actor/UC của Report3Finnal: Owner quản trị và nghiệp vụ HTX; Manager vận hành vùng được cấp; Accountant thu/chi/công nợ/lương/báo cáo theo scope; Staff công việc/thu nhập của mình; Trader đơn hàng/chứng từ/công nợ/khiếu nại của mình; người xem QR chỉ nội dung công bố; SysAdmin quản trị nền tảng. Danh sách này là yêu cầu, không phải chức năng đã triển khai.

Lát tiếp theo [bè và sơ đồ làn](WEB_RAFT_IMPLEMENTATION_PLAN.md) đã ghép mock; quyết định RAFT-DEC-01/02 chọn Owner ghi và vật tư theo phiếu nhập INP-03 sau. Tiếp theo là phiếu nhập/vật tư → giống/chu kỳ/nhật ký/môi trường → thu hoạch/truy xuất → khách/đơn/handover → thanh toán/công nợ → lao động/lương → báo cáo/thông báo/audit. Mỗi lát có inventory màn/actor, dữ liệu mock, trạng thái, micro-task và kiểm chứng riêng trước khi code. Không dựng menu chết hoặc hàng loạt màn trống để giả tiến độ. Chức năng hiện trường/QR công khai vẫn cần đối chiếu chiến lược kênh, không mặc định mọi UC full Web/Mobile.

| Vai trò | Có thể review trong bản mock này | Phần nghiệp vụ còn phải triển khai theo lát |
| --- | --- | --- |
| Chủ HTX | Auth, hồ sơ/bảo mật, HTX, nhân viên, account/grants, ba role cố định, dashboard nhân sự/bè, vùng/giấy tờ và quản lý bè/sơ đồ/ảnh | Phiếu nhập/vật tư, ghi chu kỳ nuôi, thu hoạch, bán hàng, tài chính, lao động/lương và báo cáo vận hành |
| Quản lý vùng | Auth/hồ sơ, tên role/phạm vi thật từ grant, xem vùng/giấy tờ/bè/sơ đồ và nguồn đoạn trong phạm vi | Ghi vận hành hiện trường, nhật ký, môi trường, công việc và các phần được phân công; đối chiếu kênh trước khi thêm Web |
| Kế toán | Auth/hồ sơ, nhãn quyền/phạm vi; account mẫu đang khóa để thử chặn login | Thu/chi/công nợ, lương, chứng từ và báo cáo theo quyền; chưa có luồng tài chính đầu cuối |
| Nhân viên | Onboarding/hồ sơ/bảo mật/thông báo; role mới không tự có quyền nghiệp vụ | Công việc, chấm công/xác nhận và thu nhập cá nhân; ưu tiên kênh theo SRS |
| Quản trị hệ thống | Đăng nhập/hồ sơ và khởi tạo HTX bằng mock | Vận hành quản trị hệ thống khác cần inventory SRS chi tiết |
| Thương lái / người xem QR | Chưa có lát Web nghiệp vụ hoàn chỉnh | Trader registration Web đã được hoãn; đơn hàng/chứng từ/QR công khai cần kế hoạch riêng, không tự mở lại quyết định |

“Có thể review” không đồng nghĩa đã tích hợp backend hoặc đã nghiệm thu toàn bộ UC. [Báo cáo đợt vùng/UX](reports/WEB_FARMING_ZONES_UX_REVIEW_2026-10-28.md) ghi bằng chứng và giới hạn của đợt này.

Nguồn hiện có: Report3Finnal UC15/SCR-11 và ma trận UC; backend develop953f597 zones/licenses; các quyết định fixed roles, contact OR, ngân hàng HTX và API gate đã chốt. SRS22/10 có khác biệt được Jira/backend nhắc tới; tìm kiếm Atlassian chưa lấy được đầy đủ tài liệu SRS mới, nên không tự coi hai bản là giống nhau. Quyền vùng được hỏi trực tiếp và người dùng chọn Owner ghi/Manager chỉ xem.

## Đánh giá UI UX Pro Max

Đã đọc README và `.claude/skills/ui-ux-pro-max/SKILL.md` qua GitHub. Hữu ích cho form, feedback, icon, keyboard và responsive; hướng dẫn giữ token/component hiện có khi nâng cấp phù hợp OMTS. Không phải thư viện runtime, không tự sinh nghiệp vụ hoặc chứng minh UI dùng tốt. Lượt này tham khảo tài liệu, chưa cài CLI/skill toàn cục hoặc chạy generator/search engine của nó. Các quy tắc hướng dẫn không được ghi đè quyết định sản phẩm.
