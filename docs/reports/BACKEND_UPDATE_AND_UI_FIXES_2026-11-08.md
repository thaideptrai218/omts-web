# Cập nhật backend và chỉnh giao diện — 08/11/2026

## Nguồn và trạng thái

- Đã fetch/prune toàn bộ remote refs từ `https://github.com/thaideptrai218/omts-backend.git`, đọc source qua git show và gh PR list. Không chỉ đọc main/develop.
- Backend checkout local sạch tại develop `559640dc` được giữ nguyên; remote develop mới `ce151375`, thêm 18 commit so với baseline này; remote main `2b789fd8`. Fetch không có nghĩa là đã cập nhật container8082 hoặc migration database.
- Không merge nhánh feature, không chạy migration/reset dữ liệu hoặc thay runtime trong đợt kiểm tra.
- Inventory tập trung các controller liên quan tại `BACKEND_UPDATE_ENDPOINTS_2026-11-08.csv`, kèm SHA đầy đủ. Đây không phải inventory toàn bộ endpoint của dự án.

## Đã nằm trong develop

| Nhóm | API/source đáng chú ý | Việc Web cần làm tiếp |
| --- | --- | --- |
| Hồ sơ HTX | GET/PUT `/api/cooperative/profile`, logo và cover-photo; certifications/publicPreview | Đồng bộ v2 theo P1 được duyệt; API có từ PR24 b826e772 ngày 05/11 |
| Hóa đơn tại cảng | POST `/api/sales-invoices`, GET `/{id}`, GET `/open-purchase-requests` | Màn lập/đọc hóa đơn, khách vãng lai, các lô bán, tiền mặt/trả sau, các câu xác nhận từ API |
| Kết thúc/gửi hóa đơn | POST `/{id}/finish`, POST `/{id}/resend` | Bước hỏi QR/công bố, xem kết quả gửi, gửi lại khi backend cho phép |
| Lô thu hoạch | POST `/api/harvest-lots/{lotId}/close`, GET `/for-sale`, `/for-sale/count` | Đóng lô với kg còn lại/lý do và phân biệt đóng tự động; cần đối chiếu DTO mới trước khi nối |
| Chu kỳ | đóng chu kỳ với summary, khóa ghi sau đóng, xác nhận đóng sớm Owner đã đồng ý | So sánh với form hiện tại, không tự bỏ bước xác nhận |
| Lao động | GET/POST `/api/attendance-settings`, GET `/api/payroll-settings`, GET `/preview`, PUT payroll-settings; job types/rates | Thiết lập chấm công/lương; chưa đồng nghĩa có đầy đủ API lịch phân công/nghỉ phép |
| Sản phẩm/khách hàng/yêu cầu mua | Controllers Products, Customers, PurchaseRequests có trên remote develop | Những 404 ở runtime8082 không phải bằng chứng rằng remote develop thiếu các API này |

SRS/DTO mới của invoice còn giới hạn: RestPayment hiện None/PayLater, VietQR ghi là PR tiếp theo. Không tự tạo phương thức thanh toán chưa có contract. Controller SalesInvoices hiện không có GET list; có GET detail theo ID. Không báo màn danh sách hóa đơn đầy đủ chỉ từ những endpoint đã có.

## Nhánh/PR đang mở ngoài develop

| PR | Nhánh/SHA đã đọc | Có gì |
| --- | --- | --- |
| [62](https://github.com/thaideptrai218/omts-backend/pull/62) | harvest-yield `4cb8ec89` | GET `/api/harvest-yield`, `/export`: theo bè/vùng/chu kỳ, cờ chưa chốt; theo chu kỳ có thể gồm lô ngoài kỳ và phải hiển thị dấu này |
| [63](https://github.com/thaideptrai218/omts-backend/pull/63) | trace-publish `2670cb7f` | GET publish-check, POST publish: kiểm thiếu nguồn gốc, Owner/Manager đúng vùng; Owner mới công bố lại lô đã rút |
| [64](https://github.com/thaideptrai218/omts-backend/pull/64) | trace-lots `66405b7f` | GET trace-search, GET lot trace, GET trace/export; truy ngược/xuôi; nhánh xếp trên PR63 |
| [65](https://github.com/thaideptrai218/omts-backend/pull/65) | trace-withdraw `d28a8ffd` | Owner: preview người nhận → rút công bố có lý do → xem thông báo đã gửi/toCall; nhánh xếp trên PR64 |
| [66](https://github.com/thaideptrai218/omts-backend/pull/66) | customer-debt `f632797e` | GET customer-debts, export, customer statement; Owner/Kế toán, toàn HTX; tổng vẫn là tổng HTX dù đang tìm kiếm; tự phân bổ tiền cũ nhất trước trong logic công nợ |

PR20 Zalo/staffing và PR25 integration cũng vẫn mở. Các nhánh lịch sử khác đã fetch nhưng không có commit mới hơn trong nhóm nghiệp vụ đang xét; không áp các nhánh xếp chồng độc lập như thể đã ở develop.

## Khác biệt cần giữ đúng quyết định

- PurchaseRequestDtos của develop dùng RequestedKg/AcceptedKg và Owner accept/decline trực tiếp. Web dùng số lồng và staffing đã được người dùng duyệt. Ngày 08/11 người dùng chốt **giữ số lồng, luồng cũ và chờ backend**; không đổi ngầm hoặc quy đổi lồng → kg.
- Thu hoạch trên develop close leftover có tối đa 2 số thập phân; nhánh yield có fix nhận số đề xuất 3 số thập phân. Phải chọn đúng ref/runtime khi tích hợp, không dùng validator của một ref với API của ref khác.
- Không tự triển khai các bước công bố/rút/thu tiền mới trong đợt chỉnh nhãn/menu; các màn mới cần bám workflow, quyền và DTO từng nhánh.

## Lỗi Hồ sơ HTX đã xác định

Browser QA mở trang báo lệch contract; Web cũ bắt buộc `status`, API v2 không trả. Web còn thiếu shortName bắt buộc, đang bắt buộc legalRepresentative/businessLines trong khi v2 cho phép trống. Đây là lệch phiên bản Web, không phải thiếu endpoint.

P1 được duyệt riêng trong `docs/decisions/WEB_BACKEND_PROFILE_SALES_ALIGNMENT_PROPOSAL_2026-11-08.md`; triển khai và kiểm tra Hồ sơ HTX v2 được ghi ở báo cáo đồng bộ tương ứng.

## Chỉnh UI theo yêu cầu

- Nhân viên ngoài giờ → Nhân viên thời vụ trên menu, dashboard, tài nguyên và trang API; sửa tên trong test liên quan, không đổi actor hoặc tập hồ sơ.
- Bỏ link Chu kỳ nuôi trùng tại Điều hành; chỉ còn Nuôi trồng; giữ kiểm quyền cũ qua operationAllowed.
- Hồ sơ cá nhân API có wrapper rộng tối đa1024px và margin-inline auto; mock cũng căn giữa. Browser1440: left208/right208, width1024; mobile360 không tràn. Không đổi OTP/nháp/tab/phiên.
- Test shell cũ còn kiểm sidebar/drawer đã được thay bởi topnav từ đợt trước: sửa 3 ca theo topnav đã duyệt, kiểm cycle đúng nhóm/chỉ một link, nhãn thời vụ, Trader không thấy chức năng Owner và đóng nhóm khi chọn link.

Giữ nguyên thay đổi local; chưa commit/push/merge.
