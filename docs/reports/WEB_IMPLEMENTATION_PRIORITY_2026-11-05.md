# OMTS Web — Backlog triển khai ưu tiên

Ngày cập nhật: 05/11/2026

Cập nhật runtime 06/11/2026: đã dựng database demo riêng và chạy chuỗi ghi nuôi trồng/mua hàng qua API. Người dùng duyệt mua hàng v2; đã nối phần lõi để hết lỗi 502/404 và phục vụ demo. [Đường dẫn, tài khoản, bằng chứng và giới hạn](MEETING_API_DEMO_2026-11-06.md). Chưa hoàn tất toàn backlog hoặc hội tụ mọi backend branch.

Tiến độ đợt đầu: đã thêm màn/BFF chu kỳ nuôi theo feature branch; xem [chi tiết triển khai](WEB_CULTIVATION_CYCLES_2026-11-05.md). Chưa nghiệm thu API live. Kết thúc chu kỳ chưa có trong controller chu kỳ đã đọc.

Tiến độ đợt tiếp: đã nối thả giống (ghi/sửa/gỡ/hoàn tất), sử dụng vật tư (ghi nhiều dòng/sửa), thu hoạch (ghi lô kèm ảnh) và thiết lập thu hoạch Owner. Xem [phạm vi và phần còn lại](WEB_CULTIVATION_BATCH_2026-11-05.md). TypeScript/lint đạt; chưa nghiệm thu API live. Các mục nhập/xuất/tồn kho ở dưới là mong muốn cần xác minh API, không nằm trong material-usage controller đã đọc.

Đợt tiếp nữa: đã thêm hồ sơ lô thu hoạch, sửa/gỡ/giữ-bỏ-thêm ảnh và tiến trình làn theo ngày cùng các lần thả giống trong chu kỳ. Xem [chi tiết và giới hạn](WEB_HARVEST_CORRECTIONS_PROGRESS_2026-11-05.md). Chưa nghiệm thu live.

Đợt loại công việc/nhật ký: đã nối màn loại công việc và lịch sử đơn giá, đổi tên/đơn giá/ngừng/khôi phục; thêm đọc nhật ký thăm bè theo chu kỳ. Ghi/sửa/gỡ nhật ký và bản đồ Web vẫn chưa triển khai. Xem [báo cáo](WEB_JOB_TYPES_LOGS_2026-11-05.md).

Đợt nhật ký/VietMap: đã nối ghi/sửa/gỡ nhật ký kèm ảnh và bản đồ VietMap trong màn Vị trí vùng và bè. Cần cấu hình `NEXT_PUBLIC_VIETMAP_API_KEY` trước build để tải nền bản đồ; local chưa có key. Chưa nghiệm thu map/browser/CRUD live. [Phạm vi và cấu hình](WEB_CULTIVATION_LOGS_VIETMAP_2026-11-05.md).

Tài liệu này chốt thứ tự xử lý các màn còn thiếu dựa trên API hiện có ở `develop` và các feature branch backend. Chưa coi màn nào hoàn tất nếu chưa có contract backend thống nhất và chưa chạy được cùng một integration environment.

## P0 — Chuỗi nghiệp vụ cốt lõi

### 1. Chu kỳ nuôi

- Màn danh sách chu kỳ theo vùng, bè và làn.
- Tạo, bắt đầu, kết thúc và xem chi tiết chu kỳ.
- Liên kết chu kỳ với giống, vật tư và lô thu hoạch.
- API tham chiếu: `feature/OMTS-220-cycles`.

### 2. Thả giống

- Màn tạo đợt thả giống.
- Chọn vùng, bè/làn, chu kỳ và số lượng giống.
- Xem lịch sử thả giống và trạng thái bản ghi.
- API tham chiếu: `feature/OMTS-220-seeding`.

### 3. Sử dụng vật tư

- Danh mục vật tư đã có một phần; còn thiếu màn ghi nhận sử dụng.
- Chọn vật tư, chu kỳ, bè/làn, số lượng và thời điểm sử dụng.
- Theo dõi tồn, lịch sử và cảnh báo thiếu dữ liệu.
- API tham chiếu: `feature/OMTS-220-materials`.

### 4. Thu hoạch

- Màn lô thu hoạch theo chu kỳ/bè/làn.
- Ghi nhận sản lượng, thời điểm, người thực hiện và ghi chú.
- Màn điều chỉnh sản lượng có lý do và lịch sử thay đổi.
- API tham chiếu: `feature/OMTS-221-harvest-lots`, `feature/OMTS-221-harvest-corrections`.

## P1 — Chuỗi giao dịch và tài chính

### 5. Bán hàng và hóa đơn

- Chọn lô thu hoạch/sản phẩm để lập hóa đơn.
- Theo dõi trạng thái hóa đơn, kg/số lượng, đơn giá và tổng tiền.
- Không dựng dữ liệu doanh thu khi backend chưa trả số liệu thật.

### 6. Thanh toán và công nợ khách hàng

- Danh sách công nợ.
- Ghi nhận thanh toán, đối soát và lịch sử giao dịch.
- API tham chiếu: `feature/OMTS-218-payments-debts`.

### 7. Trả hàng và khiếu nại

- Tạo yêu cầu trả hàng/khiếu nại.
- Theo dõi lý do, trạng thái xử lý và kết quả.
- API tham chiếu: `feature/OMTS-218-returns`.

### 8. Yêu cầu mua

- Giữ quyết định nghiệp vụ hiện tại: **số lồng và staffing cũ**.
- Không chuyển Web sang kg cho đến khi backend/PM chốt lại contract tương ứng.
- `develop` hiện đang dùng kg và Owner phản hồi trực tiếp, nên cần đồng bộ backend trước khi nghiệm thu.

## P1 — Vận hành, nhân sự và kiểm soát

### 9. Phân công, chấm công và loại công việc

- Hoàn thiện danh mục loại công việc.
- Phân công theo vùng/bè/làn/ngày.
- Chấm công và lịch sử trạng thái.
- API tham chiếu: `feature/OMTS-227-job-types` và các API workforce hiện có.

### 10. Nhật ký thao tác

- Nhật ký theo vùng với người thao tác, thời gian, hành động và mã bản ghi.
- Owner xem toàn bộ; Manager chỉ xem phạm vi được cấp.
- API tham chiếu: `feature/OMTS-220-logs`, `feature/OMTS-216-backend-integration`.

## P2 — Bản đồ và truy xuất

### 11. Bản đồ vùng nuôi kiểu Zalo Mini App

- Hiển thị bản đồ nhúng thay cho danh sách tọa độ đơn thuần.
- Marker vùng nuôi, bè và làn theo quyền truy cập.
- Mở chi tiết vùng/bè từ marker.
- Hiển thị trạng thái thu hoạch và cảnh báo khi API có dữ liệu.
- Đồng bộ cách chọn tọa độ và nhà cung cấp bản đồ với Mobile/Zalo Mini App (VietMap nếu đó là contract được backend/mobile chốt).
- Không hard-code marker hoặc số liệu sản xuất.

### 12. Truy xuất nguồn gốc

- Tra từ sản phẩm/hóa đơn về lô thu hoạch, chu kỳ, bè/làn, vật tư và vùng.
- Chỉ triển khai các mắt xích mà backend trả dữ liệu thật.

## P2 — Báo cáo

- Tổng hợp sản lượng theo vùng/chu kỳ/lô.
- Doanh thu, công nợ và thanh toán.
- Hiệu quả vật tư và thu hoạch.
- Báo cáo chi tiết có bộ lọc và xuất dữ liệu khi backend cung cấp endpoint.

## Thứ tự implement

1. Chu kỳ nuôi.
2. Thả giống.
3. Sử dụng vật tư.
4. Lô thu hoạch và điều chỉnh.
5. Bán hàng/hóa đơn.
6. Thanh toán và công nợ khách hàng.
7. Trả hàng/khiếu nại.
8. Phân công/chấm công/loại công việc.
9. Nhật ký thao tác.
10. Bản đồ nhúng đồng bộ Zalo Mini App.
11. Truy xuất nguồn gốc.
12. Báo cáo tổng hợp.

## Điều kiện hoàn tất mỗi nhóm

- Contract backend đã xác định trên một branch integration.
- Có màn Web theo quyền actor, trạng thái loading/rỗng/lỗi và thao tác chính.
- Không tạo mock số liệu sản xuất thay cho API.
- TypeScript và kiểm tra liên quan đạt trước khi chuyển nhóm.
- Không commit, push hoặc merge nếu chưa có yêu cầu riêng.
