# Bè nuôi và sơ đồ làn: triển khai, tự review và bàn giao

Ngày28/10/2026. Nhánh `feature/OMTS-132-web-foundation`, chưa merge develop. Đây là lát quản lý bè bằng mock, không phải nghiệm thu API/QA hoặc hoàn thành mọi nghiệp vụ nuôi trồng.

## Quyết định và nguồn

Đã đọc Report3Finnal UC18/76/77, SCR12/60/61, BR01/02/03/25/27/28; Jira OMTS-210, cha OMTS-119 và OMTS-209; backend local develop953f597 (RaftsController, RaftService, RaftLayout, RaftConditionService, LaneConditionRules và demo fixture). Không fetch/pull/chạy backend hoặc thay DB trong lượt này. SRS mới22/10 chưa lấy được đầy đủ; không tự coi tài liệu cũ và mới tương đương.

Người dùng đã chốt RAFT-DEC-01/02: chỉ Owner ghi bè; người có View đọc đúng phạm vi; lưu bè/sơ đồ trước, chi phí từ phiếu nhập INP-03 sau. Không tạo phiếu vật tư kiểu UC76/77 cũ. Các quyết định được lưu trong [OPEN_QUESTIONS](../decisions/OPEN_QUESTIONS.md). Không sửa SRS/Jira/backend, không đánh Jira Done từ kết quả mock.

## Phần đã triển khai

Theo [micro-plan RF1–RF8](../WEB_RAFT_IMPLEMENTATION_PLAN.md):

- `/farming/rafts`: danh sách tìm mã/vị trí/vùng không dấu, lọc vùng và trạng thái kết hợp qua URL. Vùng không được cấp không biến thành xem tất cả. Có skeleton, rỗng, lỗi/retry và từ chối quyền.
- Hồ sơ bè mở bằng popup, thể hiện vùng, tọa độ, kích thước, ghi chú, ảnh và chi phí. `null` là chưa có chi phí; không đổi thành0 hoặc suy ra từ kích thước.
- Sơ đồ làn theo ngày/chu kỳ, tỷ lệ theo mét từ mốc A. Gieo, thu hoạch và hao hụt được chia đoạn từ sự kiện; kế hoạch thu hoạch là lớp riêng. Popup nguồn giữ ngày, phạm vi gốc, người ghi/xác nhận, lô giống/đơn hàng nếu có. Không suy số kg từ màu/chiều dài.
- Owner tạo bè trong vùng đang dùng, lưu thông tin và ít nhất một làn A/B. Mã duy nhất trong vùng; tọa độ bắt buộc; mô tả vị trí tùy chọn theo SaveRaftRequest; chiều dài dương, tối đa2 chữ số thập phân; các số làn liên tiếp1…N.
- Sửa metadata và sơ đồ dùng `recordVersion` mới từ lần ghi trước. Thay cấu trúc tạo layout mới, giữ layout cũ. Chu kỳ mở khóa cấu trúc nhưng vẫn cho sửa metadata. Không xóa làn đã có sự kiện lịch sử.
- Ngừng/khôi phục có xác nhận. Chu kỳ mở chặn ngừng; vùng ngừng chặn tạo/khôi phục bè. Form chưa lưu phải được lưu/hủy trước khi trở về thao tác trạng thái.
- Ảnh JPEG/PNG≤10MiB lưu riêng sau khi có bè. Kiểm MIME/header/size; lỗi thay ảnh giữ ảnh và metadata cũ. Kiểm lại quyền/version sau await đọc file. Object URL được thu hồi khi đóng/đổi ảnh.
- Bộ quyền sản phẩm cho vùng/bè chỉ có View ở vai trò được gán; Owner-write kiểm riêng. Scope OWN được kiểm theo từng grant, không mở rộng từ grant ZONE của vùng khác.
- Link từ hồ sơ vùng tới bè theo stable zoneId; bị chặn khi metadata vùng còn nháp/pending. Kiểm ngừng vùng lấy bè In Use từ cùng registry, hiển thị mã bè cản trở trong popup xác nhận.
- Dashboard Owner có số bè đang dùng/đã ngừng/chu kỳ mở từ cùng registry. Không đưa tổng toàn HTX cho Staff có quyền xem một vùng; không bịa thu chi/sản lượng.

Sáu bè ban đầu là tình huống frontend tổng hợp, không phải bản ghi nhập từ DB hay số liệu HTX đã kiểm chứng. Dữ liệu, ảnh, lịch sử thay đổi nằm trong bộ nhớ của phiên trang; reload sẽ khởi tạo lại mock. Service/repository tách UI khỏi nguồn mock; chưa có adapter API bè.

## Tự review và lỗi đã sửa

### RF-REV-01: Đóng form sau lỗi có thể làm mất bản nháp

Ca sửa ghi chú→Save conflict→Hủy không mở xác nhận bỏ nháp. Nguyên nhân là chỉ đọc `formState.isDirty` trong callback; React Hook Form chưa được đăng ký theo dõi thuộc tính đó trong render. Đọc `isDirty` trong render và dùng nó khi đóng form đã sửa lỗi. Test thất bại trước sửa, đạt sau sửa; giữ đầy đủ nội dung/nhãn lỗi và lựa chọn tiếp tục nhập hoặc bỏ nháp.

### RF-REV-02: Trùng React key làm lặp sơ đồ sau mutation

Browser tạo bè→lưu ảnh→ngừng sử dụng cho thấy nhiều section sơ đồ trong cùng hồ sơ. Hai component cùng cấp `RaftConditionPanel` và `RaftPhoto` đều dùng key bằng recordVersion. Rerender qua nhiều version tái hiện ổn định: mong1 sơ đồ, nhận2; React cũng cảnh báo trùng key. Đã tách prefix `condition-` và `photo-`, thêm ca hồi quy kiểm đúng1 sơ đồ/ảnh qua ba lần đổi version. Nhóm liên quan đạt125/125 sau sửa. Đây là lỗi P2 đã sửa, không phải chỉ lỗi công cụ chụp ảnh.

### RF-REV-03: Lỗi ngừng vùng bị popup xác nhận che

Khi nối registry thật, vùng còn bè hoạt động trả blocker nhưng lỗi ở hồ sơ phía sau popup. Thêm prop error cho ConfirmDialog, đưa lỗi vào chính popup đang tương tác và tránh lặp lỗi ở phía sau. Test kiểm mã bè nằm trong confirmation đã đạt. Không thay policy ngừng vùng hay phạm vi component xác nhận khác.

Rà thêm các nhánh: role bị ngừng/khóa/hết hạn; OWN khác ZONE; phản hồi sơ đồ muộn sau đổi ngày/đóng component; validation callback sau unmount; submit lặp; conflict giữ nháp; file đọc xong sau khi mất quyền hoặc record đổi; không xuất dữ liệu qua URL filter trái scope. Chưa phát hiện P1/P2 còn mở trong lát đã kiểm; không coi đó là chứng minh toàn web không có lỗi.

## Bằng chứng kiểm tra

Log/ảnh đầy đủ nằm trong `.hallmark/`, ignored. Bản kiểm production độc lập ở `D:\Đồ_án\.omts-web-zones-review-20261028` dùng node_modules thật; không build đè server3000 của người dùng. Dừng riêng server3107 do agent tạo trước mỗi build. Không thay chứng chỉ/trust store.

| Kiểm tra | Kết quả |
| --- | --- |
| Bè/vùng/dashboard/integration sau RF-REV-02 | 17 file,125 test đạt |
| Module bè sau review key | 8 file,69 test đạt, nằm trong nhóm125 bên trên |
| Full Vitest sau bản vá cuối | 209 file đạt/4 file skip;2.440 pass/31 Redis skip;156,61s |
| Lint/typecheck/build sau bản vá cuối | Đạt cả ba; build20/20 trang |
| Built-product HTTP sau bản vá cuối | Đạt28 assertions: anonymous/API source, cookie recovery và unavailable Redis; không gọi .NET thật |
| Browser trước bản vá key | Owner login; dashboard4/2/2; sơ đồ1024; nguồn đoạn/Escape; form360; tạo bè decimal dấu phẩy; ảnh PNG giải mã; ngừng; phát hiện RF-REV-02 |
| Browser sau bản vá key | Owner khôi phục B1-03→sửa làn24 thành28m→close/tiếp tục nhập giữ nháp→lưu layoutv2→lưu PNG giải mã→ngừng; sau mỗi lần đúng1 diagram/1 photo. Manager3 bè Khu Đông,0 nút ghi hiển thị; directory360 và popup không tràn ngang. Chu kỳ đóng CK-1-2 đưa ngày về10/10/2026/layoutv1; ngừng vùng trả B1-01/B1-02 ngay trong confirmation; link vùng mở đúng bộ lọc zone-east |

31 test Redis bỏ qua vì không cấp endpoint Redis test riêng trong đợt mock này. Không đổi skip/timeout/CI để lấy kết quả xanh. Typecheck cũng từng bắt sai tên icon `plus` (catalog là `add`), test double thiếu method mới và option `exact` không thuộc Testing Library; đã sửa đúng interface, không nới compiler.

647 file source/config/test giữa repo và snapshot kiểm cuối khớp SHA256,0 khác biệt. Tài liệu/bài học được cập nhật sau kiểm không làm đổi source runtime. Bằng chứng này là local; chưa tự gọi đó là CI của commit sẽ push.

Ảnh browser kiểm cuối: `.hallmark/raft-management-review-1024.png` (ignored). Server mock production độc lập3107 để sẵn cho review; server3000 không bị dừng hoặc build đè. Bộ chọn file gốc của browser có thể dùng ngôn ngữ theo máy; label/hướng dẫn của ứng dụng là tiếng Việt.

## Rà UI với Hallmark

Giữ xanh biển/token/font/shell và popup đã chốt. Dùng hướng dẫn app screen, không áp bố cục marketing vào màn nghiệp vụ. Đã chạy sloplint static với component mới và shared styles: công cụ còn báo dấu gạch trong khoảng đo/copy, thiếu stamp Hallmark ở CSS cũ, scroll-lock `overflow-x:hidden`, thiếu active-style riêng và các cảnh báo palette/backdrop/scrollbar từ shared UI. Lượt quét đầu còn đọc nhầm file test như UI; lượt sau loại test và thêm globals để nhìn đúng focus style dùng chung.

Không sửa khóa cuộn đã được kiểm hồi quy hoặc đổi theme toàn web chỉ để làm scanner hết cảnh báo. Khoảng đo bằng dấu gạch vẫn có nghĩa toán học; form/sơ đồ được kiểm bằng browser. **Không tuyên bố sloplint xanh, render-tier pass hoặc mọi Hallmark gate đã qua.** Static audit là một nguồn phát hiện, không thay test thao tác/ảnh thật.

## Giới hạn và việc tiếp theo

- API/refresh vẫn tắt. MSG06 structured metadata, tên MSG24 nhân viên và GitGuardian giữ chờ như quyết định trước; không sửa scanner hoặc history.
- Cần kiểm contract trước nối API: backend đọc ngày trước layout đầu có fallback về layout đầu; mock hiển thị chưa có sơ đồ trước ngày hiệu lực. Không tuyên bố hai adapter đã tương đương. Backend photo nhận file riêng không có rowVersion trong request; mock kiểm version tại publish sau await để giữ consistency, chưa coi đó là contract HTTP mới.
- Chưa làm nhập phiếu INP-03, tồn kho, tạo/đóng chu kỳ, gieo/thu hoạch/hao hụt, thanh toán, QR, payroll hoặc reminder thật. Sự kiện nguồn hiện dùng để đọc/kiểm sơ đồ, chưa có form ghi những nghiệp vụ đó.
- Kiểm Win/browser local không chứng minh Linux CI hoặc native mobile. Không chạy Redis/TLS/recovery thật trong lát này.

Lát tiếp theo nên đi theo phụ thuộc dữ liệu phiếu nhập/vật tư và chu kỳ/giống, đọc inventory màn/actor trước. Không hứa hoàn thành mọi vai trò trong một lượt hoặc dựng menu dẫn tới trang trống. README và reviewer guide tiếng Anh có kịch bản demo; bài123 tiếng Việt lưu local, đã ignore.
