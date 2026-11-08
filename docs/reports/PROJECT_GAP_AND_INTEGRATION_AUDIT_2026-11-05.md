# OMTS — Rà soát lỗi, màn hình và tiến độ tích hợp Web–Mobile–Backend

Ngày rà soát: 05/11/2026 (Asia/Saigon)

> Cập nhật sau pull backend: `develop` hiện là `f8e42428`, đã có khách hàng, sản phẩm/yêu cầu mua kg, ngân hàng và audit. Các nhận định dưới đây về vị trí feature branch là snapshot trước pull. Xem [kết quả pull và màn khách hàng](BACKEND_PULL_CUSTOMERS_2026-11-05.md). Web đã nối CRUD khách hàng; các module khác chưa đồng bộ đầy đủ, không phải tất cả đang thiếu API backend.

## 1. Kết luận điều hành

- Bản Web trên Vercel hiện chưa phải bản tích hợp: Production chỉ có `OMTS_DATA_SOURCE=mock`; các BFF `/api/auth/*` trả `404 {"status":"disabled"}` theo thiết kế của mock. Vì `GET /api/auth/session` bị tắt, F5 không khôi phục được phiên và quay về đăng nhập.
- Web chạy API thật ở local, nhưng chưa có môi trường QA online gồm Web + Backend HTTPS + SQL Server + Redis TLS. Đây là lỗi P0 trước mọi đánh giá số lượng màn hình.
- Backend có nhiều API mới nhưng phân tán trên các feature branch, chưa hội tụ vào `develop`. Không thể chọn một branch hiện tại để chạy đầy đủ mọi module.
- Web feature hiện đi trước `origin/develop` 91 commit và còn 10 commit local chưa push lên remote feature branch tại thời điểm rà soát.
- Mobile `origin/develop` đã chuyển sang Zalo Mini App, nhưng phần API thật và bản đồ VietMap đầy đủ hơn nằm ở `feature/acs-zalo-linking`, chưa merge.
- Báo cáo tổng hợp và ba báo cáo chi tiết theo SRS chưa có API trên bất kỳ backend branch nào đã kiểm tra. Không được dựng số sản xuất giả ở frontend.

Vì vậy, mức “20%” là hợp lý nếu đánh giá **bản online có thể nghiệm thu end-to-end**, dù số màn Web đã viết cao hơn nhiều. Cần tách “đã có giao diện/source” khỏi “đã merge + deploy + lưu DB + test lại sau F5”.

## 2. Lỗi và rủi ro cần xử lý

### P0 — chặn nghiệm thu

1. **Vercel đang chạy mock**
   - `POST /api/auth/bootstrap`: 404 disabled.
   - `POST /api/auth/login`: 404 disabled.
   - `POST /api/auth/logout`: 404 disabled.
   - `GET /api/auth/session`: 404 disabled.
   - Hậu quả: không chứng minh được đăng nhập, phân quyền, CRUD hay lưu DB trên bản online.

2. **F5 mất đăng nhập**
   - Mock giữ trạng thái phía client; phiên server không được tạo/khôi phục.
   - Cần Web BFF trên Vercel kết nối Backend HTTPS và Redis TLS, dùng cookie HttpOnly hiện có.

3. **Chưa có hạ tầng QA online đầy đủ**
   - Thiếu một backend public HTTPS ổn định.
   - Thiếu SQL Server do backend online sử dụng.
   - Thiếu Redis public/TLS cho phiên Web.
   - `localhost:8080` và `127.0.0.1:6380` chỉ dùng được trên máy local, Vercel không truy cập được.

4. **Backend bị chia nhỏ theo branch**
   - Không có branch tích hợp chứa đồng thời toàn bộ account, farming, purchasing, cycle, harvest và sales mới.
   - Chạy một feature branch làm các màn thuộc branch khác trả 404 hoặc sai contract.

5. **Contract yêu cầu mua đang lệch**
   - Web hiện dùng `requestedCages`/“số lồng”.
   - Backend mới `feature/OMTS-223-purchase-requests` dùng kg và Owner phản hồi.
   - SRS 27/10 cũng mô tả yêu cầu mua theo kg. Web/Mobile phải cùng dùng contract cuối cùng do PM/Backend chốt.

6. **Nhánh chính chưa phản ánh tiến độ thật**
   - Web `origin/develop` mới chỉ có foundation cũ.
   - Mobile `develop` không chứa phần API/map đầy đủ của `feature/acs-zalo-linking`.
   - Backend `develop` mới tích hợp đến PR #21; các module nghiệp vụ mới vẫn ở feature branch.

### P1 — sai/thiếu luồng cốt lõi

1. Chưa có Web cho ghi nhận sử dụng vật tư theo bè/chu kỳ.
2. Chưa có Web cho thả giống, hoàn tất thả giống và sửa/gỡ bản ghi giống.
3. Chưa có Web cho lô thu hoạch, sửa/gỡ lô, danh sách lô đang bán và cấu hình thu hoạch.
4. Chưa có màn khách hàng/thương lái theo API mới, gồm gộp hồ sơ khách hàng.
5. Màn sản phẩm và yêu cầu mua hiện có cần đổi sang contract backend mới.
6. Chưa có màn tài khoản ngân hàng nhận tiền theo branch backend mới.
7. Chưa có báo cáo tổng hợp và ba báo cáo chi tiết theo SRS.
8. Chưa có API/màn cho chuỗi bán hàng đầy đủ: hóa đơn bán, thanh toán khách hàng, công nợ khách hàng, trả hàng bán, khiếu nại chất lượng, truy xuất lô và trang nguồn gốc công khai.
9. Nhật ký thao tác Web đã có màn, nhưng API chỉ nằm ở `feature/OMTS-216-audit-search`, chưa nằm trong backend runtime chung.
10. Công nợ nhà cung cấp Web đã có màn, nhưng API thuộc nhánh purchasing/seeding liên quan; không đảm bảo chạy trên branch logs/cycles.

### P2 — đồng bộ và chất lượng

1. Web bản đồ hiện chỉ liệt kê tọa độ và mở Google Maps; Mobile feature dùng bản đồ VietMap nhúng. Trải nghiệm và nhà cung cấp bản đồ chưa đồng nhất.
2. Mobile `develop` và feature thực tế khác nhau lớn; cần chọn source of truth trước khi tiếp tục.
3. Cần rà lại thuật ngữ Việt sau khi contract harvest/sales/report được chốt.
4. Cần ma trận smoke test theo role trên cùng một môi trường QA, không kiểm từng branch rời rạc.
5. Cần công bố commit SHA của Web, Mobile và Backend trên màn/biên bản QA để tránh tester kiểm nhầm bản.

## 3. Inventory màn Web hiện có

### Đã có source và adapter API/BFF

- Đăng nhập, đăng xuất, bootstrap/session, đổi mật khẩu, khôi phục, onboarding.
- Hồ sơ cá nhân, thay đổi liên hệ, tùy chọn thông báo.
- Tổng quan HTX (chưa phải báo cáo tổng hợp theo REPORT-01..03).
- Hồ sơ HTX và chứng nhận HTX.
- Vùng nuôi, giấy phép/vị trí, bè/làn, ảnh và tình trạng liên quan.
- Chu kỳ nuôi, tiến độ làn và nhật ký chăm sóc.
- Nhân viên, tài khoản nội bộ, role/quyền/grant.
- Phân công/chấm công, công việc cá nhân và nghỉ phép.
- Nhà cung cấp, vật tư đầu vào.
- Phiếu nhập, trả nhà cung cấp, thanh toán và đối chiếu công nợ nhà cung cấp.
- Đo nước, lịch sử, ngưỡng, xác nhận/sửa/hủy và biểu đồ xu hướng.
- Sản phẩm bán và yêu cầu mua (nhưng contract yêu cầu mua đang cũ/lệch kg).
- Hộp thư thông báo.
- Nhật ký thao tác Owner.
- Bản đồ vị trí dạng danh sách + liên kết Google Maps.

### Có API backend mới, Web cần làm/đồng bộ ngay

1. **Sử dụng vật tư**
   - `GET/POST /api/rafts/{raftId}/material-usages`
   - `GET/PUT /api/material-usages/{usageId}`
2. **Thả giống**
   - seed lots, seeding records, preview/complete seeding, sửa/gỡ bản ghi.
3. **Thu hoạch**
   - danh sách/tạo/chi tiết lô thu hoạch;
   - sửa/gỡ lô;
   - lô đang bán và số lượng lô đang bán;
   - cấu hình và preview tự đóng lô.
4. **Khách hàng**
   - CRUD khách hàng;
   - xem trước và thực hiện gộp hồ sơ.
5. **Sản phẩm**
   - đồng bộ CRUD, ngừng dùng/khôi phục theo contract mới.
6. **Yêu cầu mua của thương lái**
   - thương lái: danh sách, chi tiết, gửi, hủy;
   - Owner: danh sách, chi tiết, chấp nhận/từ chối;
   - đổi đơn vị và payload sang kg theo backend/SRS mới.
7. **Tài khoản ngân hàng nhận tiền**
   - nối API ở `feature/OMTS-223-bank-account` sau khi contract được hợp nhất.
8. **Tìm kiếm nhật ký thao tác nâng cao**
   - facets, detail và record link theo `feature/OMTS-216-audit-search`.

### Chưa có API backend ở bất kỳ branch đã kiểm tra

- Báo cáo tổng hợp.
- REPORT-01 Hiệu quả bán hàng.
- REPORT-02 Xu hướng giá bán.
- REPORT-03 Vấn đề sau bán hàng.
- Hóa đơn bán hàng hoàn chỉnh.
- Thanh toán và công nợ khách hàng hoàn chỉnh.
- Khiếu nại chất lượng và trả hàng bán hoàn chỉnh.
- Truy xuất nguồn gốc theo lô và trang nguồn gốc công khai hoàn chỉnh.
- Các phần payroll/lương còn thiếu nếu lấy SRS 27/10 làm chuẩn cuối.

## 4. Thiết kế màn Báo cáo tổng hợp và báo cáo chi tiết

### 4.1 Route đề xuất

- `/reports`: Báo cáo tổng hợp.
- `/reports/sales-performance`: Hiệu quả bán hàng (REPORT-01).
- `/reports/price-trends`: Xu hướng giá bán (REPORT-02).
- `/reports/post-sale-issues`: Vấn đề sau bán hàng (REPORT-03).

### 4.2 Quy tắc dữ liệu

- Báo cáo tổng hợp không tự tính từ các danh sách đã tải rời rạc ở browser.
- Backend phải dùng cùng dịch vụ truy vấn/công thức với ba báo cáo chi tiết để tổng luôn khớp chi tiết.
- Bộ lọc chung: từ ngày, đến ngày, vùng; tùy khối có khách hàng và sản phẩm.
- Khi bấm một KPI, điểm biểu đồ hoặc hàng xếp hạng, Web mở báo cáo chi tiết và giữ nguyên bộ lọc trong URL.
- Không lưu số tổng hợp giả và không dùng metric không có nguồn.

### 4.3 Nội dung `/reports`

- Doanh thu, giảm giá sau bán, hàng bán trả lại, doanh thu thuần.
- Kg lập hóa đơn, kg đã bán.
- Khoản thực nhận và công nợ khách hàng khi phạm vi lọc cho phép.
- Xu hướng giá bình quân có trọng số theo kg, kèm thấp nhất/cao nhất.
- Số khiếu nại theo trạng thái, số lượt trả hàng, số hóa đơn giảm giá và số hóa đơn hủy.
- Các nhóm cần chú ý: khách hàng/vùng/sản phẩm có biến động hoặc vấn đề sau bán; chỉ hiển thị khi API trả dữ liệu thật.

### 4.4 Nội dung ba màn chi tiết theo SRS

1. **Hiệu quả bán hàng**: nhóm theo khách hàng, sản phẩm, vùng hoặc ngày/tuần/tháng; revenue, price cuts, returns, net revenue, kg; drill-down hóa đơn; export.
2. **Xu hướng giá bán**: sản phẩm, kỳ, đơn vị ngày/tuần/tháng, vùng; kg, giá bình quân có trọng số, thấp nhất, cao nhất; drill-down dòng hóa đơn; export.
3. **Vấn đề sau bán hàng**: nhóm theo khách hàng, vùng hoặc lô thu hoạch; claim theo trạng thái, return, price cut, invoice cancellation; drill-down sự kiện; export.

### 4.5 API backend cần đề nghị

- `GET /api/reports/summary`
- `GET /api/reports/sales-performance`
- `GET /api/reports/sales-performance/{groupKey}/invoices`
- `GET /api/reports/price-trends`
- `GET /api/reports/price-trends/{groupKey}/lines`
- `GET /api/reports/post-sale-issues`
- `GET /api/reports/post-sale-issues/{groupKey}/events`
- endpoint export tương ứng hoặc content negotiation đã được backend thống nhất.

Tên endpoint chỉ là đề xuất kỹ thuật; Backend/PM cần chốt contract, filter, scope quyền, cách phân trang và định dạng export trước khi Web nối.

## 5. Đồng bộ bản đồ Mobile và Web

### Mobile feature hiện tại

- Dùng `@vietmap/vietmap-gl-js` và `VITE_VIETMAP_API_KEY`.
- Style: VietMap `hm`.
- Bản đồ vùng/bè dùng tọa độ từ API, fit bounds và mở chi tiết bè từ marker.
- Chọn vị trí bằng click/kéo marker.
- Trong Zalo có thể lấy location token, gửi `POST /api/me/zalo-location`, rồi backend đổi thành latitude/longitude.
- Có fallback nhập tọa độ tay và thông báo riêng cho lỗi 401/403/423/429/timeout.

### Web hiện tại

- Đã có BFF `GET /api/zone-map` gọi backend `GET /api/zones/map`.
- UI mới chỉ hiển thị danh sách tọa độ và liên kết ra Google Maps, chưa có bản đồ nhúng/marker như Mobile.

### Cách làm khớp

1. Giữ một contract chung từ backend: zone + rafts + latitude/longitude + status.
2. Web dùng VietMap GL cùng Mobile để marker, màu trạng thái, fit bounds và thông báo lỗi đồng nhất.
3. Web tiếp tục gọi qua BFF để giữ session; key tile công khai phải giới hạn domain/quota tại VietMap.
4. Chỉ Mobile/Zalo dùng `/api/me/zalo-location`; Web dùng browser geolocation hoặc chọn điểm trên bản đồ nếu nghiệp vụ cho phép.
5. Chia sẻ quy tắc kiểm tra tọa độ, nhưng không copy nguyên component ZMP sang Next.js.

## 6. Tiến độ merge thực tế

### Web

- `origin/develop`: chỉ mới foundation (commit `b1a6c22`, 15/10/2026).
- nhánh làm việc `feature/OMTS-132-web-foundation`: đi trước develop 91 commit.
- local HEAD `65f447b`: đi trước remote cùng nhánh 10 commit tại thời điểm rà soát.
- Kết luận: lượng code nhiều nhưng chưa merge và bản deploy không chứng minh API thật.

### Mobile

- `origin/develop` commit `081d368` (03/11/2026): Zalo Mini App thay Expo.
- `feature/acs-zalo-linking`: lệch develop 1 commit phía develop và có 14 commit riêng; chứa API thật, farming, VietMap, workforce, sales và account linking phong phú hơn.
- `feature/zalo-mini-app`: có 3 commit riêng nhưng đã bị develop vượt.
- local `feature/OMTS-133-mobile-foundation`: Expo cũ, lệch develop và có nhiều thay đổi chưa commit; không nên dùng làm chuẩn để merge Zalo hiện tại.
- Kết luận: phải rebase/cherry-pick có kiểm soát phần `acs-zalo-linking` lên Zalo `develop`, không merge nguyên Expo cũ.

### Backend

- `origin/develop` commit `dec1de24` (04/11/2026): mới tích hợp permission matrix/fixed roles (#21).
- Các module mới vẫn ở feature branch: account/staging/SMS, cooperative/zones/rafts, purchasing, water, cycle/log/material/seeding, harvest, products/customers/purchase requests, bank account và audit search.
- Một số backend feature branch đã bị force-update ngày 04–05/11; frontend không nên pin contract theo SHA cũ.
- Không có report controller/API trên bất kỳ remote branch đã kiểm tra.

## 7. Thứ tự xử lý đề xuất

1. Tạo backend integration branch chính thức và merge theo dependency/migration; chạy CI backend.
2. Triển khai QA online: Backend + SQL Server + Redis TLS; seed tài khoản QA an toàn.
3. Cấu hình Vercel API mode và xác nhận login/F5/logout/CRUD lưu DB.
4. Push 10 commit Web local, mở/cập nhật PR; không để source nghiệm thu chỉ nằm trên máy.
5. Đồng bộ contract Web/Mobile với Swagger của integration branch, đặc biệt purchase request kg.
6. Làm Web material usage → seeding → harvest lots/settings → customers/products/purchase requests → bank account/audit.
7. Merge phần Zalo API/VietMap cần thiết từ `acs-zalo-linking` lên Mobile develop.
8. Backend làm sales invoice, customer debt/payment, claim/return, traceability/public provenance.
9. Backend chốt report APIs; Web làm `/reports` và ba detail report, sau đó export.
10. Smoke test theo Owner, Zone Manager, Accountant, Employee và Trader trên đúng SHA của ba repo.

## 8. Định nghĩa “xong” để báo cáo tiến độ

Một màn chỉ được tính hoàn thành khi:

1. Code đã push và PR/commit xác định được.
2. Backend endpoint đã nằm trong integration/develop, không chỉ feature branch.
3. Bản QA online chạy API mode.
4. Quyền đúng actor/scope vùng.
5. Create/update/status transition ghi DB và đọc lại được sau F5/đăng nhập lại.
6. Empty/loading/error/conflict được xử lý.
7. Web và Mobile dùng cùng contract khi cùng một nghiệp vụ.
8. Có bằng chứng smoke test và SHA deploy.

## 9. Phản hồi UI/luồng từ Owner ngày 05/11 — backlog cần hoàn thành

Các mục dưới đây đã được ghi nhận để xử lý trong đợt kế tiếp; chưa coi là đã sửa.

### Thông báo và yêu cầu thông báo

- Chuyển lối vào Thông báo khỏi nhóm menu sidebar thành biểu tượng ở khu vực đầu sidebar/header ứng dụng; có trạng thái chưa đọc.
- Bấm biểu tượng hiện danh sách 3–5 thông báo mới nhất và lối **Xem tất cả thông báo**.
- Xem tất cả mở trang danh sách đầy đủ với phân trang/lọc; bấm một dòng mở trang chi tiết thông báo và liên kết hồ sơ liên quan theo quyền.
- Màn hiện tại dùng `InboxDialog` dạng popup và `NotificationRecordDialog` lồng; cần thiết kế lại thành route mà vẫn giữ API đọc/đánh dấu đã đọc.
- “Yêu cầu thương lái” hiện là popup `TraderRequestsDialog`; cần trang danh sách và chi tiết riêng, trạng thái chờ/đã xử lý, thao tác duyệt/từ chối có lý do. Xác nhận lại người dùng gọi “Yêu cầu thông báo” là yêu cầu thương lái hay một loại yêu cầu khác khi triển khai.

### Vùng/bè và cách xem danh sách

- Bổ sung công tắc ở đầu danh sách để chọn **dạng lưới / dạng bảng** cho vùng nuôi và bè; ghi nhớ lựa chọn phù hợp, thể hiện trạng thái/định danh và không thay đổi quyền.
- Lỗi **Mở hồ sơ bè nuôi** cần tái hiện bằng tài khoản, vùng, mã bè và response của `GET /api/rafts/{id}`. Web hiện gọi detail rồi chỉ mở editor nếu response parse thành công; thông báo chung chưa cho biết lỗi là 404, 403, schema hay backend branch thiếu contract.
- Bản đồ vùng/bè hiện chỉ có danh sách tọa độ và liên kết Google Maps; đối chiếu VietMap của Mobile như mục 5.

### Lỗi thao tác và phân trang

- Tập hợp mọi nơi hiện “Chưa thể thực hiện thao tác. Hãy kiểm tra dữ liệu rồi thử lại.”; ghi endpoint, HTTP status, `code`, body được phép hiển thị, account/zone, backend SHA và request ID. Câu này nằm ở `workspaceError` fallback khi lỗi không thuộc trường hợp đã map, nên chưa thể quy nguyên nhân chung là dữ liệu sai.
- Trên danh sách quản lý API, Web gửi `pageSize=20`; các màn phiếu nhập, thanh toán, đo nước và yêu cầu mua cũng dùng 20. Nếu chỉ thấy 10 bè, kiểm tra số bè demo theo vùng, bộ lọc, `total`, `page` và response backend; không có giới hạn pagination 10 chung trong các màn vừa kiểm.
- Cần hiển thị rõ tổng số, kích thước trang, số trang và lựa chọn kích thước trang khi API hỗ trợ; đảm bảo trang cuối và đổi bộ lọc không để người dùng ở trang rỗng.

### Phạm vi màn cần hoàn thiện

Giữ toàn bộ mục P0/P1 ở trên: tài khoản/phiên QA online, vật tư sử dụng, thả giống, thu hoạch, khách hàng, sản phẩm/yêu cầu mua theo kg, tài khoản ngân hàng, nhật ký, hóa đơn bán, tiền khách, khiếu nại/trả hàng, truy xuất và bốn màn báo cáo. Với màn đã có, phải kiểm tra mọi nút tạo/xem/sửa/chuyển trạng thái bằng API của **cùng** backend integration branch trước khi đánh dấu xong.

## 10. Đợt sửa đầu tiên 05/11 — trạng thái thực tế

- Đã sửa BFF bè theo `RaftView` hiện hành: làn dùng `id/laneNumber/status`, lệnh lưu dùng `laneCount`, phản hồi `RaftSaved` được lấy từ trường `raft`. Đây là nguyên nhân có thể xác định từ contract khiến “Mở hồ sơ” nhận 502; chưa xác nhận lại bằng API live do Docker Engine hiện không chạy.
- Đã thay câu lỗi chung bằng thông báo riêng cho 404, 409, 502, 503 và mất kết nối. Chưa có request ID/endpoint ở response BFF để đối chiếu sự cố chi tiết.
- Đã thêm đổi dạng lưới/bảng cho danh sách vùng và bè ở API, dạng lưới/bảng vùng mock và dạng lưới/danh sách bè mock. Lựa chọn được nhớ trong browser. Danh sách API có chọn 10/20/50/100 dòng, tổng và số trang.
- Đã chuyển thông báo API ra biểu tượng đầu sidebar/header, xem nhanh tối đa 5, trang `/notifications` có lọc tất cả/chưa đọc và phân trang, `/notifications/[id]` xem nội dung và mở hồ sơ theo quyền. Nút đánh dấu đọc dùng API hiện có. Backend chưa có GET chi tiết thông báo; route chi tiết đọc lại trang nguồn, nên link cũ có thể mất vị trí khi nhiều thông báo mới đến.
- Popup “Yêu cầu thương lái” vẫn giữ nguyên. Cần chốt tên/loại yêu cầu người dùng gọi “Yêu cầu thông báo” trước khi đổi route này.
- Yêu cầu mua đã có thêm route chi tiết `/operations/purchase-requests/{id}` để mở trực tiếp bằng mã yêu cầu; adapter vẫn dùng cùng BFF và quyền của danh sách. Luồng lập kế hoạch nhân lực, lời mời và phản hồi ca đã có trong source.
- Các màn sử dụng vật tư, thả giống, lô thu hoạch, khách hàng/gộp hồ sơ và tài khoản ngân hàng chưa có feature Web tương ứng trong source hiện tại; chưa thêm màn giả vì báo cáo yêu cầu API thật.
- Chưa hoàn thiện các module P0/P1 và báo cáo ở trên; không được đánh dấu chúng hoàn thành chỉ vì đợt sửa UI này.
- Kiểm tra source: typecheck, lint, build và các ca liên quan đạt (shell, bè, inbox/BFF). Browser ở localhost:3002 báo dịch vụ không khả dụng; `docker ps` không kết nối được Docker Engine. Bản mock ở localhost:3000 mở được trang đăng nhập; chưa đăng nhập hoặc xác nhận CRUD API live trong đợt này.
