# Quản lý vùng nuôi và sửa UX Web — 28/10/2026

> **CI sau push93e738f đã kiểm:** [báo cáo CI](WEB_CI_93E738F_REVIEW_2026-10-28.md). Linux2.367 pass/31 Redis skip, gồm vá ZONE-REV-01; lint/typecheck/build19/19 và26 HTTP đạt. Gitleaks/pr-title SUCCESS; GitGuardian FAILURE tiếp tục để sau. Các số liệu local phía dưới là lịch sử kiểm trước khi có bằng chứng CI này.

Đợt này bổ sung một lát chức năng theo UC15/SCR-11, thay vì dựng hàng loạt màn trống. Phần được triển khai là mock dùng trong Web; chưa tích hợp API hoặc hoàn thành toàn bộ chức năng của các vai trò. [Kế hoạch và phạm vi còn lại](../WEB_SRS_ROLE_IMPLEMENTATION_PLAN.md).

## Nguồn và quyết định

Đã đọc Report3Finnal UC15, SCR-11 và ma trận actor/UC; đối chiếu source local backend develop953f597 ở Farming/Zones, Farming/Licenses và Files/FileRules. Không fetch/pull backend trong đợt này và chưa lấy được toàn văn SRS22/10 mới hơn; không khẳng định hai phiên bản tài liệu giống nhau.

Người dùng đã chốt hai điểm: Owner ghi vùng, Manager chỉ xem; lưu vùng trước rồi bổ sung giấy tờ trong popup. Không sửa SRS/Jira/backend. Backend hiện giới hạn giấy phép ở Owner; đọc theo vùng của Manager trong mock cần được đối chiếu khi nối API. Danh mục quyền vùng của sản phẩm chỉ cho gán View, không còn cho role Manager tự có Create/Edit.

Tên Khu Đông/Khu Nam và tọa độ đang là dữ liệu mẫu. Tọa độ/diện tích tham khảo DemoFarmingZoneStep backend; không phải hồ sơ HTX đã được xác minh. Đổi tên giữ nguyên ID; không tự gán lại hoặc xóa quyền.

## Các micro-task đã thực hiện

| Phần | Kết quả |
| --- | --- |
| Sidebar/icon | Sidebar và nội dung dùng chung grid80/288px; hover/focus mở, rời cả hai mới thu; giữ menu mobile, reduced motion và khóa cuộn. Icon riêng cho nhân viên/account/role/dashboard/HTX/vùng. |
| Ngày tiếng Việt | Thay bốn input native date ở nhân viên/ngày nghỉ/grants bằng text + bộ chọn ngày/tháng/năm. Dữ liệu hợp lệ vẫn ISO; ngày sai được giữ để schema báo lỗi, không tự sửa. Ngày mặc định theo UTC+7. |
| Zone contract | Domain/schema/repository/service riêng; mã trùng, tọa độ, diện tích, version và quyền được kiểm trong adapter. Không có lệnh xóa vùng. |
| Shared source | Accounts/employees/picker tạo account/role impact/dashboard và nhãn role-scope lấy tên từ một store. Grant lưu zone ID; đổi tên không sửa grant. |
| Danh sách/popup | Skeleton, lỗi/retry, không quyền, tìm không dấu và lọc trạng thái; popup metadata hoặc thông tin chỉ đọc. Owner thêm/sửa; giữ nháp khi lỗi và hỏi trước khi bỏ nháp. |
| Trạng thái | Xác nhận ngừng/sử dụng lại; kiểm version và bè đang dùng; giữ hồ sơ/grants/lịch sử. Dataset hiện chưa có sổ bè thật, blocker được kiểm bằng fixture. |
| Giấy tờ | Bốn loại theo backend; kiểm ngày/phạm vi/file PDF/JPEG/PNG10MiB. Một giấy tờ có thể bao phủ nhiều vùng. Gia hạn tạo bản thay thế, giữ tệp/ngày bản cũ; tra cứu hiệu lực theo ngày, ngưỡng sắp hết hạn30 ngày. Hai loại bắt buộc được kiểm từ rule backend; không giả có cron/email nhắc hạn. |
| Vòng đời | Chặn double submit bằng ref, chặn đóng khi pending, bỏ phản hồi sau unmount; hủy validation cũ sau bỏ nháp. File được đọc xong vẫn kiểm lại quyền/version trước publish. Tệp chỉ trong RAM, không localStorage. |

## Lỗi thực tế, nguyên nhân và cách sửa

**Sidebar che chữ.** Bản cũ tăng chiều rộng aside từ80 lên288px nhưng phần nội dung vẫn chỉ chừa80px. Ba test mới ban đầu fail. Chuyển cả hai vào chung grid; test hover/focus và kiểm browser phải đối chiếu hai cạnh, không chỉ nhìn class.

**Định dạng ngày phụ thuộc máy.** `input type=date` trả ISO nhưng phần ngày nhìn thấy do locale trình duyệt quyết định; thêm `lang=vi` không đảm bảo hết mm/dd. Tách chuỗi hiển thị dd/mm/yyyy khỏi ISO. Test cũ employee-unlink fail vì còn đòi giá trị hiển thị2026-10-28; đổi assertion sang28/10/2026 và giữ assertion lệnh service endDate2026-10-28. Test birthday cũ kiểm thuộc tính max được chuyển sang kiểm giới hạn nhìn thấy/ARIA cùng validation thực tế, vì text input không có native max.

**Ref và kiểu form.** Lint bắt việc gán `inputRef.current` qua props; dùng useImperativeHandle để xuất ref của input, không tắt rule. Typecheck bắt mảng zoneIds readonly trong domain không khớp mảng mà resolver/form quản lý; form dùng kiểu suy từ schema và sao chép mảng, domain vẫn readonly. Các lỗi generic handleSubmit là lỗi dây chuyền của mismatch này; không ép `any` để bỏ qua.

**Quyền test cũ.** fixed-roles.test đưa bộ permission mẫu cũ có Create/Edit vùng vào sản phẩm mới nên save bị từ chối. Dùng matrix hợp lệ của sản phẩm trong test chia sẻ quyền và thêm test riêng chỉ còn View; giữ nguyên test từ chối quyền không hợp lệ.

**Mất focus sau lưu.** Browser cho thấy nút submit bị disabled khi pending làm focus về body. Trả focus sau commit render về tên vùng, hoặc mã vùng nếu mã trùng. Mã trùng có thông báo ngay ô nhập; lỗi lưu không xóa nháp.

**Lỗi còn hiện sau Hủy — P3 ZONE-REV-01.** Kiểm browser sau mã trùng cho thấy form đã reset nhưng lỗi của hook mutation vẫn còn. Đây là hai nguồn state riêng: reset của React Hook Form không biết state error trong useZoneMutation. Thêm clearError vào hook, gọi cùng thao tác Hủy và mở rộng hồi quy mã trùng để kiểm cả giá trị cũ lẫn alert đã được xóa. 43 test vùng đạt trên source cuối; browser build sau vá không còn alert cũ.

**Bản thay thế khác scope.** Nếu chỉ lọc giấy tờ theo vùng trước khi tính hiệu lực, Manager có thể nhìn bản cũ như còn hiệu lực dù bản thay thế đã chuyển sang vùng khác. Projection chỉ kèm ngày bắt đầu thay thế của bản cũ; không lộ tên/ID vùng ngoài phạm vi. Test kiểm ngày trước/sau và trạng thái thiếu hồ sơ.

**Timeout công cụ trên Windows.** Full suite lần đầu có timeout15s ở test khởi động Vitest con cho Redis URL sai và timeout10s khi nạp plugin ESLint; chạy riêng98 ca đạt. Lượt toàn repo sau chỉ còn timeout Redis, còn2.359 ca đạt/31 Redis skip. Giữ toàn bộ assertion “URL sai phải fail cả bốn suite”, tăng riêng giới hạn khởi động subprocess trên Windows lên45s và timeout case50s; Linux giữ15/20s. Không tắt scanner, bỏ suite hoặc biến invalid config thành skip. Lượt kiểm cuối dưới đây mới là bằng chứng sau sửa.

Một lượt main repo sau đó còn timeout case employment5s và lỗi `[vitest-pool-runner]: Timeout waiting for worker to respond` ở employee-account-creation; tổng lượt đó2.359 pass/1fail/31skip và1 unhandled error, kéo dài2068s. Chưa xác định nguyên nhân gốc của worker timeout, nên không khẳng định Next.js là thủ phạm và không sửa application để né lỗi. Chuyển kiểm tra sang bản sao có dependencies độc lập và cùng source; kết quả cuối bên dưới đạt toàn bộ suite. Đây là giới hạn môi trường cần giữ trong báo cáo, không được xóa lần chạy lỗi khỏi nhật ký.

## Nghiên cứu thiết kế

Đã đọc [UI UX Pro Max README](https://github.com/nextlevelbuilder/ui-ux-pro-max) và [SKILL.md chính thức](https://github.com/nextlevelbuilder/ui-ux-pro-max/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md). Đây là hướng dẫn và công cụ tra cứu thiết kế, không phải thư viện component runtime. Phù hợp để tham khảo hierarchy, contrast, focus, mục tiêu chạm, SVG và responsive; giữ palette xanh biển/token/component hiện có. Chưa cài CLI/skill toàn cục, chưa chạy generator hoặc công bố kết quả tra cứu tự động.

Về ngày: [MDN input date](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date) giải thích khác biệt locale/value; [WAI date-picker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) là tham khảo khả năng truy cập. Bộ chọn OMTS dùng select Ngày/Tháng và input Năm trong Dialog có sẵn; không tuyên bố đã cài calendar-grid đầy đủ của ví dụ WAI.

## Kiểm chứng và tự đánh giá

Bản production kiểm riêng ở `D:\Đồ_án\.omts-web-zones-review-20261028`, dùng npm ci với node_modules độc lập; không build đè server3000. Build19/19 và26 HTTP assertions (có `/farming/zones`) đạt ở snapshot đầu. Bằng chứng browser đầu: rename→nhân viên dùng tên mới; giấy tờ áp dụng hai vùng; bản thay thế01/11 chưa hiệu lực vào28/10, chuyển bản cũ sang “Đã thay thế” vào01/11. Snapshot này có trước các sửa focus/nhãn ARIA cuối, nên kiểm cuối cần ghi riêng, không gộp làm một.

Kết quả cuối trên bản sao độc lập, kiểm SHA-256616 file source/config không khác main repo:

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| npm ci | 455 packages; dùng lockfile hiện có, không thêm dependency runtime |
| npm run lint / typecheck | Đạt; kiểm lại sau ZONE-REV-01 cũng đạt |
| npm test | 201 file pass,4 Redis suite skip; **2.367 test pass/31 Redis skip**,178,63s. Chạy trước vá ZONE-REV-01 |
| Hồi quy sau ZONE-REV-01 | **43/43**,6 file; kiểm cả alert cũ và giá trị đã hủy, giữ các ca quyền/version/file/history/pending |
| npm run build | Đạt19/19; build lại sau ZONE-REV-01 đạt |
| npm run test:session-pages | **26 assertions đạt** trên build sau vá; gồm route vùng không lộ mock/private data ở API mode. Backend không được gọi |
| Browser | Owner tạo vùng với số thập phân dấu phẩy→thiếu giấy tờ→mã trùng/focus→Hủy→ngừng/khôi phục→lưu bằng version mới; focus tên vùng và xóa alert cũ xác nhận trên production build |
| Responsive | 360px: body345, popup328/343 không tràn; Manager chỉ1vùng/no-write. 1024px: sidebar/content cùng cạnh80 khi thu,288 khi mở bằng focus, scrollWidth1024. Hover state/keyboard có hồi quy component; không tuyên bố đã điều khiển hover thật bằng pointer-move API |
| Chất lượng mã | File mới được format bằng Prettier3.6.2 chạy tạm qua npm exec; không thêm vào package.json. git diff --check đạt; learning121 tiếp tục ignored |

Browser giấy tờ đã kiểm thêm/gia hạn bằng PDF mẫu cục bộ áp dụng hai vùng và trạng thái trước/sau ngày thay thế trên snapshot đầu; core repository giữ nguyên sau đó ngoài format. PDF là fixture, không phải giấy phép thật. Popup ngày bản cuối là compact ở360px, có Ngày/Tháng/Năm tiếng Việt; không mở toàn màn trống. Preview cuối dùng mock ở `http://127.0.0.1:3107/farming/zones`; server3000 cũ không bị build đè hoặc restart.

Log/ảnh nằm local trong `.hallmark/` và thư mục review; bài học121 nằm `docs/learning/` và tiếp tục được Git ignore. Không lấy kết quả local làm trạng thái CI GitHub của commit mới.

Tự đánh giá: đạt lát UI/mock vùng và các sửa UX đã mô tả, có đường đi service riêng và kiểm quyền/version ở adapter. Chưa đủ điều kiện nghiệm thu API/QA hoặc toàn bộ role workflows. Nguy cơ còn lại nằm ở contract quyền licenses, dữ liệu/vận hành thật và SRS mới chưa đối chiếu đủ; các giới hạn này phải được giải quyết ở lát tích hợp sau.

Giới hạn còn giữ: API/refresh tắt; MSG06 structured và tên MSG24 chờ backend; ngân hàng HTX chờ BA; GitGuardian historical incidents để sau. Không có cron, lưu DB/cloud, dữ liệu bè thật, nhắc giấy phép thật hoặc public QR giấy tờ. Các chức năng nuôi trồng, bán hàng, tài chính, lương và báo cáo còn trong kế hoạch theo lát. Không tự merge develop hoặc đổi Jira Done.
