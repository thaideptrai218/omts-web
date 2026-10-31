# Jira và contract backend PR19 — 29/10/2026

Đã đọc Jira OMTS cập nhật từ 28/10, chi tiết OMTS-216/217/218/219/227, description và diff của [backend PR19](https://github.com/thaideptrai218/omts-backend/pull/19). PR19 đang **OPEN/DRAFT**, head `56b4a2f4e54838bece1de1e23ca9899b8b0a1b5d`, chưa merge. Backend local và origin/develop vẫn `953f597`; không đổi checkout/runtime hoặc chạy migration.

## Thay đổi mới trong Jira

| Ticket | Trạng thái lúc đọc | Nội dung và tác động Web |
| --- | --- | --- |
| [OMTS-216](https://welterial.atlassian.net/browse/OMTS-216) | In Progress | Platform/ACCOUNT theo SRS 27/10. PR0.2 là message catalogue; fixed roles, account/contact, notifications và audit còn là các PR dự kiến. |
| [OMTS-217](https://welterial.atlassian.net/browse/OMTS-217) | To Do | FARM v2: hồ sơ HTX mở rộng/certifications, giấy vùng, ảnh/làn bè và bỏ layout-version/segment cũ. |
| [OMTS-218](https://welterial.atlassian.net/browse/OMTS-218) | To Do | PURCHASE v2: bè theo từng dòng, thanh toán độc lập/huỷ thanh toán, sổ công nợ và quy tắc tiền mới. |
| [OMTS-219](https://welterial.atlassian.net/browse/OMTS-219) | To Do | WATER v2: bắt buộc ảnh/bè/nhiệt độ, Active/Voided, sửa tại chỗ; khác Draft/Confirmed/version hiện tại. |
| [OMTS-220](https://welterial.atlassian.net/browse/OMTS-220)–[OMTS-226](https://welterial.atlassian.net/browse/OMTS-226) | To Do | Chu kỳ, thu hoạch, truy nguồn, bán hàng, công nợ, khiếu nại, báo cáo/dashboard. Chưa có API triển khai trong runtime đang kiểm. |
| [OMTS-227](https://welterial.atlassian.net/browse/OMTS-227) | To Do | LABOR thiết kế lại: employee app OTP, QR chấm công, nhân công/bảng lương; thay phạm vi cũ của OMTS-212/PR13. |
| [OMTS-212](https://welterial.atlassian.net/browse/OMTS-212) | Done | Ticket LAB cũ. Trạng thái này không chứng minh LABOR mới đã hoàn thành hoặc endpoint đã deploy. |

OMTS-216 dự kiến ba role Zone Manager/Accountant/**Cooperative Owner** và loại role editor, trong khi quyết định Web đã duyệt là Zone Manager/Accountant/**Staff**, Owner sửa quyền/ngừng/khôi phục. Chưa tự thay quyết định người dùng bằng kế hoạch Jira. Web API tiếp tục chỉ đọc roles và thu hồi grant hiện hữu theo ID; không suy role code, không tạo grant mới. Notification push-only dự kiến PR0.5 cũng chưa thay catalog InApp/Email/Zalo + Push chỉ xem vừa được duyệt.

## Tương thích PR19 đã nối ở Web

- Catalog thêm 33 mã canonical và câu tiếng Việt an toàn. Decoder ưu tiên `code`, rồi `title` đã biết, sau đó mới `legacyCode` top-level hoặc trong extensions. Không phân tích chuỗi tiếng Anh và không đảo bảng legacy nhiều-nghĩa. Native code giữ nguyên trên wire; semantic mapping chỉ phục vụ nhánh xử lý hiện hữu.
- Ví dụ MSG-GEN-01 + legacy MSG11 được hiểu là input chưa hợp lệ, không phải blocker đang sử dụng; MSG-GEN-09 + legacy MSG03 là trạng thái không phù hợp, không phải trùng bản ghi. Employee duplicate ID/field metadata vẫn bind với mã mới. MSG06/MSG24 và các mã backend giữ lại tiếp tục chạy.
- Các success envelope hiện hữu cho phép trường cộng thêm `messageCode`/`noticeCode`; Web dùng câu tiếng Việt theo hành động đã xác nhận và chỉ project dữ liệu cần thiết. Notification PUT nhận cả response cũ và PR19; nếu `notice` có giá trị, trả câu MSG-ACCOUNT-21 và UI chỉ hiện câu đó, không ghép thêm câu thành công. Không chuyển raw message/notice tiếng Anh xuống UI.
- Bỏ `harvestEventId`/`lotId` khỏi schema và bảng nguồn tình trạng bè; đọc được cả response cũ có hai null thừa và response mới thiếu chúng.

Fixture kiểm cả contract cũ/mới, mã mới không có legacy, legacy fallback, code nhiều-nghĩa, employee metadata và notification notice. HTTP/browser thật vẫn kiểm với develop953f597; chưa tuyên bố chạy tích hợp trên backend PR19 hoặc nghiệm thu các nghiệp vụ SRS mới. Bằng chứng kiểm cuối ở [báo cáo cá nhân/quyền](WEB_PERSONAL_NOTIFICATIONS_ACCESS_API_2026-10-29.md). Không sửa Jira, không merge backend/Web, không tính phần trăm hoàn thành từ số endpoint.
