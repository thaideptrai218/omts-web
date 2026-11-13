# PHẦN A - Vùng nuôi, Bè nuôi và làn, Quan trắc nước

Ngày lập: 11/11/2026. Người đọc: Chủ hợp tác xã (Owner), cần xem logic có đúng nghiệp vụ không để sửa.
Phạm vi: chỉ ĐỌC mã và gọi GET thử trên backend demo (127.0.0.1:8082); không sửa mã, không ghi dữ liệu. Phần B (gieo giống, chu kỳ, kế hoạch, nhật ký, vật tư, thu hoạch, sản lượng, truy xuất, kho) do báo cáo khác viết.

Nguồn đối chiếu: SRS v8 (`.hallmark/srs-v8/srs-v8-full.txt`), backend `D:\Đồ_án\omts-backend` (nhánh develop, thư mục làm việc hiện tại), web `D:\Đồ_án\omts-web` (nhánh feature/OMTS-132-web-login-farming).

Ký hiệu đối chiếu SRS: ✔ đúng SRS | ⚠ khác SRS | ➕ không có trong SRS (hệ thống làm thêm).
Ký hiệu "(đang triển khai)": thay đổi đã được chủ duyệt (file `FARMING_BACKEND_RULES_REVIEW_2026-11-11.md`, quyết định D9) hoặc đã có trong mã làm việc nhưng chưa phải bản chốt. Mục này liệt kê ở mục 0.4.

---

## 0. Đọc trước

### 0.1 Sơ đồ quan hệ (như đang cài đặt)

```
Hợp tác xã
 └─ Vùng nuôi (FarmingZone)  ── mã duy nhất toàn HTX, trạng thái In Use / Discontinued
      ├─ Giấy phép vùng (ZoneComplianceDocument)  ── nhiều giấy / vùng, chỉ Owner thấy
      ├─ Ngưỡng nước của vùng (6 số: pH, độ mặn, nhiệt độ; min + max)   ── nằm ngay trên bản ghi vùng
      ├─ Bè nuôi (Raft)  ── mã duy nhất TRONG vùng, trạng thái In Use / Discontinued
      │    ├─ Ảnh bè (tối đa 3)
      │    ├─ Làn (Lane) số 1..N  ── trạng thái In Use / Removed (lưu), "trạng thái trong ngày" (không lưu, tính ra)
      │    └─ Chu kỳ nuôi (Phần B)
      └─ Phép đo nước (WaterMeasurement)  ── thuộc VÙNG, ghi kèm 1 bè = "nơi đo", kèm ảnh đồng hồ, kèm bản sao ngưỡng lúc đo
```

Điểm cần nhớ: phép đo nước tính cho CẢ VÙNG; bè chỉ ghi lại nơi đã đo, vùng không có "điểm đo cố định" (BR-WATER-01). Không có bảng "điểm đo" riêng.

### 0.2 Ma trận quyền (đã thử thật bằng GET với 3 tài khoản demo)

Tài khoản thử: `owner`, `quanlyvung1` (Zone Manager, chỉ vùng DEMO-01), `ketoan` (Accountant, mọi vùng). Mã `403 MSG-GEN-08` = "You do not have permission to perform this action. Nothing has been changed."

| Việc | Owner | Zone Manager (theo zone được cấp) | Accountant | Căn cứ |
|---|---|---|---|---|
| Xem danh sách / chi tiết vùng | Mọi vùng | Chỉ vùng của mình (vùng khác: 403, đã thử DEMO-02) | Mọi vùng được cấp (thử: thấy cả DEMO-01 và DEMO-02) | `FarmingLookupAccess.VisibleZonesAsync` (Farming/FarmingLookupAccess.cs:17) |
| Tạo / sửa / ngừng / dùng lại vùng, xin mã vùng | Có | Không | Không | `[RequireCooperativeOwner]` trên `FarmingZonesController` |
| Giấy phép vùng (xem, thêm, sửa, thay thế, tải file) | Có | Không (đã thử: 403) | Không (403) | `ZoneLicensesController` có `[RequireCooperativeOwner]` ở cấp lớp |
| Xem danh sách bè, chi tiết bè, trạng thái làn trong ngày | Có | Có, trong zone của mình | Không (đã thử: 403) | `VisibleRaftZonesAsync` (FarmingLookupAccess.cs:51) dùng quyền CULTIVATION_CYCLES.View |
| Tạo / sửa bè, đổi số làn, thêm/xóa ảnh, ngừng / dùng lại bè | Có | Không | Không | `RaftsController` |
| Bản đồ vùng (`/api/zones/map`) | Thấy cả bè | Thấy vùng của mình + bè | Thấy vùng, KHÔNG thấy bè (mảng bè rỗng) | `FarmingZoneService.MapAsync` |
| Xem phép đo nước, biểu đồ, tổng quan vùng | Có | Có, trong zone của mình (zone khác: 403) | Không (403) | `PermissionFunctions.WaterMeasurements` |
| Ghi phép đo, nhận dạng ảnh (OCR) | Có | Có | Không | `FixedRoles.cs:39` (ZoneManager Full(WaterMeasurements)) |
| Sửa (hiệu chỉnh) / hủy phép đo | Mọi phép đo Active | CHỈ phép đo do chính mình ghi, trong zone còn quyền | Không | `WaterCorrectionPreconditions.cs:24` |
| Xuất file Excel phép đo | Có | Có (Full gồm Export) | Không | `FixedRoles.cs:39` |
| Xem ngưỡng nước | Có | Có (zone của mình) | Không (403) | `WaterThresholdsController` |
| Đặt ngưỡng nước (1 vùng hoặc mọi vùng) | Có | Không | Không | `[RequireCooperativeOwner]` |

Ghi chú về cách web kiểm quyền: `resourceAllowed` (`features/api-workspace/resources.ts:110`) cho MỌI tài khoản staff quyền "Xem" vùng và bè (vì không khai báo mã chức năng); vì vậy Accountant vẫn thấy tab "Bè nuôi" nhưng backend trả 403. ⚠ Nên ẩn tab theo quyền thật (xem Câu hỏi A-14).

SRS: ma trận §I.4.4 cho FARM-02/03/04 chỉ Owner "Full", Zone Manager/Accountant "No". Việc ZM/Accountant được XEM vùng, ZM được XEM bè là phần hệ thống làm thêm có chủ đích (BR-FARM-08, Q27: màn Chu kỳ/Thu hoạch/Nước cần danh sách bè). Đánh dấu ➕ cho phần xem.

### 0.3 Thời gian

Mọi ngày giờ nghiệp vụ tính theo giờ Việt Nam (UTC+7, `BusinessClock`). Ví dụ trong báo cáo lấy từ dữ liệu demo hôm nay 11/11/2026; id rút gọn 8 ký tự đầu.

### 0.4 Các thay đổi "(đang triển khai)" liên quan phần này

| Thay đổi | Hiện trạng trong mã làm việc | Ghi chú |
|---|---|---|
| Chọn tọa độ bằng bản đồ thay cho gõ vĩ độ/kinh độ | Web: component `LocationPicker` (`features/farming-api/location-picker.tsx:17`) dùng trong form vùng và bè; chưa commit (file untracked trong git status) | Người dùng nhấp/kéo ghim, phím mũi tên nhích ghim, nút "Dùng vị trí hiện tại của tôi", "Xóa vị trí" |
| Từ chối tọa độ (0, 0) và vĩ/kinh độ bị đảo | Backend: `CoordinateRules.RefusalHint` (Farming/CoordinateRules.cs:28) gọi trong `FieldCheck.Coordinates` (FieldCheck.cs:59). Lỗi MSG-GEN-01 liệt kê "Latitude", "Longitude" kèm `hint` | Đã nằm trong mã backend nhưng thuộc quyết định PM 11/11/2026 |
| Tọa độ bè là tùy chọn | `RaftValues.Read` gọi `Coordinates(..., required: false)` (Farming/Rafts/RaftValues.cs, ngay sau dòng kiểm mã bè) | SRS FARM-04 cũng nói ghim bản đồ là tùy chọn ✔ |
| Cảnh báo mềm: ghim ngoài Việt Nam; ghim bè cách ghim vùng quá 5 km | Backend trả `warnings[]` (`COORDINATES_OUTSIDE_VIETNAM`, `RAFT_FAR_FROM_ZONE`) trong phản hồi lưu vùng/bè (CoordinateRules.cs:19 giới hạn 5 km) | Web KHÔNG hiển thị `warnings` (đã tìm không thấy trong `src`). Xem Câu hỏi A-6 |

Các mục khác của file rà soát (giới hạn thu hoạch theo giống, "Thu xong làn", kế hoạch thu hoạch, trọng lượng/hao hụt...) thuộc Phần B, không nằm ở đây.

---

# 1. VÙNG NUÔI (Farming zone)

## 1.1 Mục đích
Một HTX có nhiều vùng nuôi; mọi bè, phép đo nước, chu kỳ đều thuộc một vùng. Vùng không bao giờ bị xóa, chỉ "ngừng sử dụng" để giữ lịch sử (GBR-01). Vùng là đơn vị phân quyền: quyền của nhân viên được cấp theo vùng (BR-FARM-08).

## 1.2 Ai dùng, quyền
Owner tạo/sửa/ngừng/dùng lại. Zone Manager và Accountant chỉ xem (theo vùng được cấp). Chi tiết ở mục 0.2.

## 1.3 Luồng từng bước

Màn hình: menu "Vùng nuôi" (`/workspace/zones`, `/farming/zones`) -> `ZoneScreen` (`features/zones-api/zone-screen.tsx`). Bộ lọc bên trái (Trạng thái, và với Owner có "Hồ sơ giấy phép"), ô tìm theo mã/tên/vị trí, nút "Bản đồ" bật bản đồ toàn cảnh, nút "Thêm vùng nuôi". Bấm một dòng mở hồ sơ vùng ngay tại chỗ với các tab: Thông tin, Bản đồ, Bè nuôi, Giấy phép (chỉ Owner), Chu kỳ nuôi, Nhân viên (chỉ Owner), Quan trắc nước (`zone-detail-panel.tsx:34`).

Danh sách đọc một lần toàn bộ vùng rồi lọc/sắp xếp/phân trang ngay trên trình duyệt. Backend `GET /api/zones` giới hạn tối đa 100 dòng mỗi trang (`MaxPageSize`).

### 1.3.1 Thêm vùng (FARM-02.0)
1. Owner bấm "Thêm vùng nuôi" -> hộp thoại có hai nhóm: "Thông tin vùng" (Mã vùng, Tên vùng, Vị trí, Diện tích (ha)) và "Vị trí trên bản đồ" (chọn ghim).
2. Web kiểm tra: tất cả 6 trường bắt buộc; vĩ độ -90..90, kinh độ -180..180, diện tích 0..1.000.000 (`zone-model.ts:74`). Lỗi hiện ngay dưới ô: "Nhập mã vùng.", "Nhập số từ -90 đến 90." hoặc "Chọn vị trí của vùng trên bản đồ."
3. Gửi `POST /api/zones` (chỉ Owner). Backend (`FarmingZoneService.CreateAsync`, FarmingZoneService.cs:87):
   - kiểm tra các trường (`Validate`, :274), thu thập TẤT CẢ trường sai rồi trả một lỗi `400 MSG-GEN-01` ("<tên trường đầu tiên> is missing or invalid. Please check and enter it again."), danh sách đầy đủ nằm trong `fields`;
   - kiểm tra trùng mã: nếu trùng trả `409 MSG-GEN-02` "Farming zone already exists. Your entries are kept: change them, or open the existing record." kèm `existingId` để web mở vùng đã có;
   - tạo vùng với trạng thái In Use, ghi audit `FarmingZone.Created` (giá trị sau), lưu;
   - trả "Farming zone saved." (MSG-GEN-05) kèm `warnings` nếu ghim nằm ngoài Việt Nam.
4. Web đóng hộp thoại, hiện "Đã thêm vùng nuôi." và tải lại danh sách.
Luồng lỗi khác: kết quả lưu không rõ (mất mạng) -> web chặn thêm lại, yêu cầu đóng hộp thoại và tải lại danh sách để đối chiếu, tránh tạo trùng.

SRS nói hệ thống ĐỀ XUẤT mã vùng kế tiếp (GBR-03). Backend có `GET /api/zones/next-code` (trả `KV01`...; live hôm nay trả `KV01` vì dữ liệu demo dùng mã DEMO-01) nhưng web CHƯA gọi: Owner phải tự gõ mã. ⚠ (A-1)

### 1.3.2 Sửa vùng (FARM-02.1)
1. Tab "Thông tin" -> "Chỉnh sửa" (ẩn khi vùng đã ngừng) -> sửa -> "Lưu" (hoặc "Bỏ qua").
2. `PUT /api/zones/{id}` kèm `rowVersion` (chống ghi đè khi hai người cùng sửa). Backend: vùng phải In Use, nếu không `409 MSG-GEN-09` "Farming zone DEMO-03 is Discontinued and cannot be used for this action."; kiểm tra như tạo (trùng mã loại trừ chính nó); rowVersion cũ -> lỗi MSG06 (tải lại); chỉ ghi audit `FarmingZone.Updated` khi có giá trị thay đổi (trước/sau chỉ gồm trường đổi).
3. Đổi mã vùng KHÔNG đổi mã các bè của vùng (GBR-03 ✔).

### 1.3.3 Ngừng sử dụng vùng (FARM-02.2)
1. Tab "Thông tin" -> "Ngừng sử dụng vùng" -> hộp xác nhận: "Hồ sơ và lịch sử vẫn được giữ. Vùng chỉ ngừng được khi không còn bè đang sử dụng." (ZoneStatusDialog). Không bắt nhập lý do (backend chấp nhận lý do tùy chọn, tối đa 1000 ký tự).
2. `POST /api/zones/{id}/discontinue`. Backend (FarmingZoneService.cs:167): vùng phải In Use; nếu còn bè In Use trả `409 MSG-GEN-06` "Cannot proceed because N records are still in use: B1-01, B1-02, ... Please handle these records first." kèm `raftCodes`. Nếu được: đổi trạng thái, audit `FarmingZone.Discontinued` (kèm trạng thái cũ/mới và lý do).
3. Hậu quả: vùng không hiện trong danh mục chọn vùng mới; giấy phép của vùng không còn được nhắc hết hạn; phép đo nước, ngưỡng, bè của vùng chỉ xem.

### 1.3.4 Dùng lại vùng (FARM-02.3)
`POST /api/zones/{id}/reactivate` (hoặc `/resume`). Luôn cho phép nếu đang Discontinued, giữ nguyên mã và lịch sử; bè giữ trạng thái riêng của mình (phải dùng lại từng bè). Giấy phép chưa Replaced được nhắc lại từ lần kiểm tra kế tiếp nếu chưa gửi thông báo ở trạng thái hiện tại.

### 1.3.5 Xem bản đồ
Tab "Bản đồ" và nút "Bản đồ" ở toàn màn hình: hiện ghim vùng và các bè có tọa độ ("x/y bè có tọa độ"), nút "Toàn cảnh". Dữ liệu từ `GET /api/zones/map`. Vùng chưa có tọa độ: "Vùng chưa có tọa độ".

## 1.4 Bảng trường

| Trường | Kiểu | Bắt buộc | Giới hạn / kiểm tra | Mặc định / nguồn | Hiển thị ở đâu |
|---|---|---|---|---|---|
| Mã vùng `code` | text | Có | 1-50 ký tự (FarmingZoneService.cs:277; SequentialCodes.cs:20). Duy nhất toàn HTX, tính cả vùng đã ngừng (index unique `FarmingZoneConfiguration`:12). Web cho gõ tới 100 ký tự (`zone-form-fields.tsx:21`) nên 51-100 ký tự bị backend từ chối | Gợi ý KV01, KV02... qua `GET /api/zones/next-code` (web chưa dùng) | Danh sách, tiêu đề hồ sơ, mọi bộ chọn vùng |
| Tên vùng `name` | text | Có | 1-200 ký tự (backend), web giới hạn 100 | Nhập tay | Danh sách, hồ sơ |
| Vị trí `location` | text | Có | 1-500 ký tự (backend), web 300 | Nhập tay | Danh sách, hồ sơ |
| Vĩ độ `latitude` | số thập phân (6 số lẻ) | Có (cả hai tọa độ phải đi cùng nhau) | -90..90; (đang triển khai) từ chối (0,0) và cặp đảo; làm tròn 6 số lẻ (`FieldCheck.Coordinates`, FieldCheck.cs:59) | Chọn ghim trên bản đồ | Hồ sơ "Thông tin", bản đồ |
| Kinh độ `longitude` | số thập phân | Có | -180..180 | như trên | như trên |
| Diện tích `area` | số, đơn vị HA | Có | Phải > 0 và < 100 nghìn tỷ (FarmingZoneService.cs:281). Web cho nhập 0..1.000.000 (số 0 qua được web nhưng backend từ chối) | Nhập tay | Danh sách (cột "Diện tích (ha)"), hồ sơ. Đơn vị ha ghi trong `Domain/Entities/Farming/FarmingZone.cs:21` |
| Trạng thái `statusId` | 101 In Use / 102 Discontinued | Hệ thống | Đổi chỉ qua nút Ngừng/Dùng lại | Tạo mới = In Use | Nhãn "Đang sử dụng / Ngừng sử dụng" |
| Số bè đang dùng `inUseRaftCount` | số | Hệ thống | Đếm bè In Use | Tính | Cột "Bè đang dùng" |
| Trạng thái giấy phép `licenseState` | Expired / ExpiringSoon / null | Hệ thống | CHỈ Owner nhận; null khi giấy phép tốt, khi chưa có giấy phép, hoặc với staff (FarmingZoneService.cs:251) | Tính từ giấy phép "mới nhất chưa bị thay thế" | Cột "Hồ sơ giấy phép" |
| `rowVersion` | chuỗi | Khi sửa | Phát hiện sửa đồng thời | Từ lần đọc | Ẩn |
| Ngưỡng nước (6 số) | số | Không | Xem mục 4 | Trống khi vùng mới | Mục 4 |

Quan hệ SRS: FARM-02 yêu cầu tên, vị trí trên bản đồ, diện tích, mã. Hệ thống làm thêm: "Vị trí" văn bản bắt buộc ➕ (SRS nói "location"), cho phép sửa mã ➕ (SRS FARM-02.1 có "edits its code" ✔).

## 1.5 Quy tắc và tính toán

| # | Quy tắc | Trạng thái so với SRS |
|---|---|---|
| Z1 | Vùng không xóa; chỉ In Use <-> Discontinued | ✔ GBR-01 |
| Z2 | Chỉ sửa vùng đang In Use (MSG-GEN-09) | ✔ FARM-02.1.E1 |
| Z3 | Ngừng vùng bị chặn khi còn bè In Use (MSG-GEN-06 liệt kê mã bè). Bè có chu kỳ mở không thể ngừng (xem mục 3), nên gián tiếp vùng có chu kỳ mở không ngừng được | ✔ FARM-02.2.E1 |
| Z4 | Dùng lại vùng luôn được; bè không tự dùng lại | ✔ FARM-02.3 |
| Z5 | Mã vùng duy nhất toàn HTX kể cả vùng đã ngừng; đổi mã vùng không đổi mã bè | ✔ GBR-03 |
| Z6 | Một người khác sửa trước -> báo xung đột (rowVersion) | ✔ NFR |
| Z7 | Mọi thay đổi ghi audit (Created, Updated, Discontinued, Reactivated) với giá trị trước/sau | ✔ GBR-02 |
| Z8 | Diện tích là số dương, đơn vị ha; KHÔNG đối chiếu với tổng kích thước các bè | ➕ (SRS không nói) |
| Z9 | (đang triển khai) tọa độ (0,0) hoặc đảo vĩ/kinh bị từ chối; ghim ngoài Việt Nam (vĩ 8-24,5; kinh 102-110) chỉ cảnh báo | ➕ quyết định PM 11/11/2026 |
| Z10 | Zone Manager/Accountant xem được vùng trong phạm vi quyền (Accountant xem tên, vị trí, diện tích) | ➕ (SRS ma trận ghi "No") |

Ví dụ thật (live): `DEMO-01` "Vùng nuôi Ngọc Vừng", ha 12,5, 8 bè In Use, tọa độ 21,0712 / 107,4321, giấy phép "ExpiringSoon". `DEMO-03` "Vùng nuôi Quan Lạn (đã ngừng)" ha 5, 0 bè, trạng thái Discontinued.

## 1.6 Liên kết
- Tới: Bè (tab Bè nuôi), Giấy phép (tab), Chu kỳ nuôi (`/farming/cycles?zoneId=`), Nhân viên làm việc ở vùng (tab Nhân viên, từ module nhân viên), Quan trắc nước (`/operations/water?zoneId=`), Thu hoạch tháng này (`/operations/harvest-yield`).
- Từ: bộ chọn vùng của phiếu mua hàng, phép đo nước, chu kỳ, thu hoạch, cấp quyền vùng cho nhân viên (FARM-05), hóa đơn bán (vùng do Zone Manager chọn).
- Thanh số liệu nhanh trên hồ sơ vùng: Bè (đang dùng/tổng), Chu kỳ (đang mở), Nhân viên, Giấy phép (chỉ Owner), Nước, Thu hoạch tháng này.

## 1.7 Câu hỏi cho chủ (Vùng)
A-1. Mã vùng: SRS muốn hệ thống đề xuất mã (KV01...), backend đã có nhưng web bắt gõ tay. Anh/chị muốn web điền sẵn đề xuất không?
A-2. Diện tích vùng có cần quan hệ với bè không (ví dụ cảnh báo khi tổng diện tích bè lớn hơn diện tích vùng)? Hiện không kiểm.
A-3. Ngừng vùng hiện không bắt nhập lý do, chỉ ghi nhận người làm và giờ. Có cần bắt buộc lý do (ví dụ "hết hạn giao biển") không?
A-4. Accountant hiện xem được toàn bộ danh sách vùng (tên, vị trí, diện tích). SRS ma trận ghi "No". Giữ như vậy được không?

---

# 2. GIẤY PHÉP VÙNG (Zone license)

## 2.1 Mục đích
Lưu các giấy tờ pháp lý của vùng (quyết định giao khu vực biển, giấy phép nuôi trồng, cam kết ATTP...), kèm file ảnh/PDF, theo dõi còn hạn / sắp hết hạn / hết hạn và nhắc Owner trước 30 ngày. Giấy phép không hiện trên trang truy xuất công khai (BR-FARM-09).

## 2.2 Ai dùng, quyền
Chỉ Owner (xem, thêm, sửa, thay thế, tải file). Zone Manager và Accountant nhận 403 (đã thử). Staff không thấy tab và không thấy huy hiệu giấy phép trong danh sách vùng.

## 2.3 Luồng từng bước

Màn hình: hồ sơ vùng -> tab "Giấy phép" (`zone-licenses-tab.tsx`). Có ô "Ngày xem tình trạng" (mặc định hôm nay) để xem trạng thái các giấy ở một ngày bất kỳ (FARM-03.4). Bảng: Loại giấy tờ, Số, Hiệu lực từ, Hết hạn, Tình trạng. Bấm số giấy để xem chi tiết ngay dưới dòng (`zone-license-detail.tsx`); nút "Thêm giấy tờ" ở chân tab.

### 2.3.1 Thêm giấy tờ (FARM-03.0)
1. Bấm "Thêm giấy tờ" -> hộp thoại "Thêm giấy tờ vùng": Loại giấy tờ (4 loại, mặc định "Giấy phép nuôi trồng thủy sản"), Số giấy tờ*, Cơ quan cấp, Chủ thể được cấp, Ngày hiệu lực* (mặc định hôm nay), Ngày hết hạn, Phạm vi pháp lý, "Vùng được giấy tờ bao phủ*" (hộp chọn vùng), Tệp giấy tờ* (PDF/JPEG/PNG tối đa 10 MB) (`features/farming-api/license-screen.tsx:41-107`).
2. Web kiểm bằng `saveLicenseSchema` (`features/farming-api/contracts.ts:18`): số giấy 1-100 ký tự, hết hạn phải SAU hiệu lực ("Ngày hết hạn phải sau ngày hiệu lực."), phải có tệp ("Chọn tệp PDF, JPEG hoặc PNG để lưu giấy tờ.").
3. Gửi `POST /api/zone-licenses` (multipart, giới hạn 11 MB). Backend (`ZoneLicenseService.CreateAsync`, Farming/Licenses/ZoneLicenseService.cs:68): vùng phải In Use (nếu không `409 MSG-GEN-09`); kiểm trường (mục 2.4); tải file lên kho trước, lỗi kho -> `502` "The file could not be uploaded. Your other entries are kept; please try again." (MSG-GEN-03), không lưu gì; lưu giấy, audit `ZoneLicense.Created`; nếu lưu CSDL hỏng thì file vừa tải bị xóa lại.
4. Phản hồi gồm `state` tính theo hôm nay.

### 2.3.2 Sửa giấy tờ (FARM-03.3)
"Sửa giấy tờ" trong chi tiết -> cùng form, tệp tùy chọn ("Đổi tệp (không chọn để giữ tệp hiện tại)"). `PUT /api/zone-licenses/{id}` kèm rowVersion (ZoneLicenseService.cs:110). Chặn: giấy ĐÃ bị thay thế (`409 MSG-GEN-09` "License X is Replaced by Y and cannot be used for this action.", kèm `replacementId`); vùng không In Use. Vùng của giấy không đổi được. Đổi ngày hết hạn sẽ "nạp lại" hai thông báo nhắc (xem 2.5 L6). Audit `ZoneLicense.Updated` (chỉ phần đổi). File cũ bị xóa sau khi lưu xong.

### 2.3.3 Gia hạn / thay thế (FARM-03.2)
"Gia hạn / thay thế" -> form với số giấy trống, hiệu lực = hôm nay, tệp BẮT BUỘC. `POST /api/zone-licenses/{id}/replace` (ZoneLicenseService.cs:170). Tạo giấy mới cùng vùng, nối `ReplacesDocumentId`; giấy cũ thành Replaced và giữ nguyên file/giá trị. Chặn nếu giấy cũ đã có giấy thay thế (`409 MSG-GEN-09`, trả `replacementId`) hoặc vùng ngừng. Loại giấy bỏ trống thì kế thừa loại giấy cũ. Audit `ZoneLicense.Replaced` (trước: giấy cũ; sau: giấy mới). Chặn song song: index unique `ReplacesDocumentId` đảm bảo một giấy chỉ bị thay một lần.

### 2.3.4 Xem tình trạng tại một ngày
Đổi "Ngày xem tình trạng" -> `GET /api/zones/{id}/licenses?asOf=yyyy-MM-dd` tính lại trạng thái từng giấy tại ngày đó.

## 2.4 Bảng trường

| Trường | Kiểu | Bắt buộc | Giới hạn / kiểm tra | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| Loại giấy tờ `documentType` | mã | Backend: không; web: luôn gửi | SEA_AREA_ALLOCATION "Quyết định giao khu vực biển", AQUACULTURE_LICENSE "Giấy phép nuôi trồng thủy sản", FOOD_SAFETY_COMMITMENT "Cam kết an toàn thực phẩm", OTHER "Giấy tờ khác" (`LicenseTypes`, LicenseStates.cs:4) | Web mặc định AQUACULTURE_LICENSE; khi thay thế bỏ trống thì lấy loại giấy cũ | Bảng, chi tiết. ➕ (SRS không có loại giấy) |
| Số giấy `documentNumber` | text | Có | 1-100 ký tự (ZoneLicenseInput.cs:27). KHÔNG bắt duy nhất | Nhập tay | Bảng, thông báo nhắc |
| Ngày hiệu lực `effectiveDate` | ngày | Có | định dạng yyyy-MM-dd | Web mặc định hôm nay | Bảng |
| Ngày hết hạn `expiryDate` | ngày | CÓ ở backend (ZoneLicenseInput.cs:29: bắt buộc và sau ngày hiệu lực). Web: nhãn không dấu * và schema cho phép trống | > ngày hiệu lực | Nhập tay (thay thế: trống) | Bảng |
| Cơ quan cấp `issuingAuthority` | text | Không | ≤ 200 | | Chi tiết |
| Chủ thể được cấp `holder` | text | Không | ≤ 200 | | Chi tiết ➕ |
| Phạm vi pháp lý `legalScope` | text | Không | ≤ 1000 | | Chi tiết ➕ |
| Vùng `zoneId` | id | Có khi tạo | Một vùng, In Use. Sửa/thay thế: không đổi được. Web gửi `zoneIds` (danh sách, cho chọn nhiều vùng) nhưng backend chỉ nhận đúng 1 vùng (trường `zoneIds` đã lỗi thời), chọn 2 vùng -> MSG-GEN-01 "Zone" | Vùng hiện tại | Chi tiết |
| Tệp `file` | PDF/JPEG/PNG | Bắt buộc khi thêm và thay thế; tùy chọn khi sửa | ≤ 10 MB (`FileRules.Documents`) | Tải lên | Liên kết "Tải tệp giấy tờ" |
| Trạng thái `state` | Valid / ExpiringSoon / Expired / NotYetEffective / Replaced | Hệ thống | Tính, không lưu (mục 2.5) | | Bảng, chi tiết |
| Giấy thay thế / bị thay thế | id | Hệ thống | `replacesDocumentId`, `replacedByDocumentId` | | Nút "Xem giấy tờ trước / thay thế" |
| Mốc nhắc (đã gửi nhắc "sắp hết hạn"/"hết hạn") | ngày giờ | Hệ thống | Đánh dấu đã nhắc, xóa khi đổi ngày hết hạn | | Ẩn |

## 2.5 Quy tắc và tính toán

Cách tính trạng thái (`LicenseStateRules.StateOn`, Farming/Licenses/LicenseStates.cs:47), tại ngày D:

```
1. Nếu có giấy mới thay thế và ngày ghi nhận giấy mới <= D        -> Replaced   (bất kể ngày tháng)
2. Nếu D < Ngày hiệu lực                                          -> NotYetEffective (Chưa có hiệu lực)
3. Nếu Ngày hết hạn < D                                           -> Expired (Hết hạn)
4. Nếu (Ngày hết hạn - D) <= 30 ngày (tính cả ngày hết hạn)      -> ExpiringSoon (Sắp hết hạn)
5. Còn lại                                                        -> Valid (Còn hiệu lực)
```
Hằng số `ExpiringSoonDays = 30` (LicenseStates.cs:40). Ví dụ live: giấy `NTTS-2025-DEMO-01` hiệu lực 07/10/2025, hết hạn 01/12/2026: hôm nay 11/11/2026 còn 20 ngày nên ExpiringSoon; giấy cũ `NTTS-2023-DEMO-01` là Replaced.

Sơ đồ trạng thái theo thời gian (một giấy chưa bị thay thế):

```
 NotYetEffective --(đến ngày hiệu lực)--> Valid --(còn 30 ngày)--> ExpiringSoon --(qua ngày hết hạn)--> Expired
                                                \______________ bất kỳ lúc nào có giấy thay thế ghi nhận ______________/--> Replaced (cuối cùng, không quay lại)
```

| # | Quy tắc | So với SRS |
|---|---|---|
| L1 | Trạng thái tính ra, không lưu (BR-FARM-06) | ✔ |
| L2 | Ngưỡng "sắp hết hạn" = 30 ngày, tính cả ngày hết hạn | ✔ |
| L3 | Replaced từ ngày giấy mới được GHI NHẬN (không phải từ ngày hiệu lực của giấy mới) | ✔ BR-FARM-06 |
| L4 | Chỉ giấy chưa Replaced mới được sửa hoặc thay thế; giấy Replaced giữ nguyên | ✔ |
| L5 | Thêm/sửa/thay thế chỉ khi vùng In Use (GBR-01) | ✔ |
| L6 | Đổi ngày hết hạn "nạp lại" hai thông báo nhắc để nhắc lại theo hạn mới | ✔ GFR-03 |
| L7 | Huy hiệu ở danh sách vùng chỉ lấy GIẤY MỚI NHẤT chưa bị thay thế (ngày hiệu lực mới nhất, rồi giờ ghi nhận mới nhất) và chỉ hiện khi Expired hoặc ExpiringSoon (`ZoneLicenseOverview.BadgeFor`, ZoneLicenseOverview.cs:26) | ✔ (SRS: huy hiệu ứng với giấy mới nhất) |
| L8 | Nhắc hết hạn gửi cho MỌI giấy chưa Replaced của vùng đang In Use, không chỉ giấy mới nhất (`ZoneLicenseReminderService.RemindAsync`, ZoneLicenseReminderService.cs:29) | ⚠ SRS GFR-03 viết "chỉ giấy mới nhất của vùng In Use được nhắc"; mã ghi rõ làm khác. Xem A-7 |
| L9 | Mỗi giấy nhắc tối đa MỘT lần "Sắp hết hạn" (MSG-FARM-01) và MỘT lần "Hết hạn" (MSG-FARM-02) (`ExpiryReminderRule.Due`, ExpiryReminderRule.cs:23). Giấy phát hiện đã hết hạn chỉ nhận thông báo "Hết hạn". Nếu chưa có Owner hoạt động, thông báo vẫn còn "đến hạn" cho tới khi có | ✔ GFR-03 |
| L10 | Thông báo chỉ gửi Owner (loại ZONE_LICENSE_EXPIRY, luôn đẩy). Nội dung: "<giấy> expires on <ngày>, in <n> days. Please renew it and record the new one." / "...expired on <ngày>. Please renew it and record the new one." | ✔ MSG-FARM-01/02 |
| L11 | Số giấy không duy nhất; không giới hạn số giấy cùng loại cho một vùng; không bắt buộc loại giấy nào | ➕ |
| L12 | Giấy mới không bị kiểm tra liên tục với giấy cũ (hiệu lực có thể bắt đầu sau khi giấy cũ đã là Replaced) | ➕ xem A-8 |
| L13 | "Missing/Thiếu hồ sơ" KHÔNG phải trạng thái backend: backend chỉ có 5 trạng thái ở trên. Web tự dùng nhãn "Thiếu hồ sơ" khi `licenseState` là null | ⚠ xem lỗi hiển thị dưới đây |

### Lỗi hiển thị cần chú ý (web, đã đối chiếu dữ liệu thật)
Web hiểu `licenseState = null` là "Thiếu hồ sơ" (`zone-table.tsx:25`, `zone-model.ts:41`, `license-screen`...). Nhưng backend trả null cả khi giấy phép TỐT lẫn khi chưa có giấy phép. Ví dụ live: vùng `DEMO-02` có giấy `GKV-2025-DEMO-02` Valid (đến 11/10/2028) nên backend trả `licenseState: null`; cột "Hồ sơ giấy phép" trên web sẽ hiện "Thiếu hồ sơ" cho vùng này. Hệ quả: bộ lọc "Còn hiệu lực" không bao giờ ra kết quả; bộ lọc "Thiếu hồ sơ" ra cả vùng có giấy tốt. Dòng cảnh báo "Thiếu hồ sơ còn hiệu lực tại ngày..." trong tab Giấy phép (`zone-licenses-tab.tsx:28`) chờ trạng thái "Missing" mà backend không bao giờ gửi, nên không bao giờ hiện. Chip "Giấy phép:" trên thanh số liệu tính riêng từ danh sách giấy nên đúng hơn.

Ví dụ khác về L7/L8: `DEMO-02` còn giấy `ATTP-DEMO-02` (Cam kết ATTP) hết hạn 27/10/2026, chưa thay thế. Huy hiệu vùng bỏ qua giấy này (vì giấy mới nhất `GKV-2025-DEMO-02` còn hạn), nhưng bộ nhắc hiện tại vẫn gửi Owner thông báo "Hết hạn" cho giấy ATTP.

## 2.6 Liên kết
Giấy phép thuộc vùng; hiện ở tab "Giấy phép", cột "Hồ sơ giấy phép" và bộ lọc ở danh sách vùng, chip "Giấy phép" trên hồ sơ vùng. Thông báo hết hạn mở bản ghi giấy (`RelatedRecordTypes.ZoneLicense`). Không nối sang bè, chu kỳ hay truy xuất công khai.

## 2.7 Câu hỏi cho chủ (Giấy phép)
A-5. Khi giấy phép vùng đã hết hạn hoặc chưa có, hệ thống hiện tại KHÔNG chặn bất kỳ nghiệp vụ nào (vẫn tạo bè, chu kỳ, thu hoạch, bán). Anh/chị có muốn cảnh báo hoặc chặn khi vùng không có giấy hợp lệ không?
A-7. Nhắc hết hạn: theo SRS chỉ nhắc giấy mới nhất; mã nhắc mọi giấy chưa thay thế. Anh/chị muốn kiểu nào? (Ví dụ DEMO-02: giấy ATTP cũ hết hạn vẫn đang được nhắc.)
A-8. Giấy thay thế có thể bắt đầu hiệu lực SAU khi giấy cũ đã bị coi là Replaced. Ví dụ ghi giấy mới hôm nay nhưng hiệu lực từ tháng sau: giấy cũ thành Replaced ngay, giấy mới "Chưa có hiệu lực", huy hiệu vùng không báo gì (khoảng trống pháp lý bị ẩn). Có cần cảnh báo/chặn khoảng trống này không?
A-9. Ngày hết hạn: backend bắt buộc, web không đánh dấu bắt buộc và cho gửi trống (sẽ bị từ chối "Expiry date is missing or invalid"). Có giấy nào không có hạn (ví dụ giấy giao biển không thời hạn) không? Nếu có, cần cho phép bỏ trống và định nghĩa trạng thái.
A-10. Số giấy không duy nhất: cho phép hai giấy cùng số trong một vùng. Chấp nhận được không?
A-11. Một giấy có thể bao phủ nhiều vùng không? Web cho chọn nhiều vùng nhưng backend chỉ nhận 1 (SRS: một giấy thuộc một vùng, mô hình dữ liệu `ZoneLicense` một vùng).

---

# 3. BÈ NUÔI VÀ LÀN (Raft, Lane)

## 3.1 Mục đích
Bè là đơn vị nuôi thực tế; mỗi bè có các làn đánh số 1..N (khoảng giữa hai dây chính). Gieo giống và thu hoạch ghi theo từng làn nguyên vẹn, nên làn phải có số cố định (BR-FARM-02). Hệ thống tính "trạng thái làn trong ngày" từ hồ sơ chu kỳ nhưng không ước lượng số kg trên làn (BR-FARM-03).

## 3.2 Ai dùng, quyền
Owner quản lý (tạo, sửa, ảnh, ngừng, dùng lại). Zone Manager chỉ XEM bè và làn trong zone của mình. Accountant không xem bè (403). Chi tiết mục 0.2.

## 3.3 Luồng từng bước

Màn hình: "Bè nuôi" (`/workspace/rafts?zoneId=...`, `/farming/rafts`) -> `RaftScreen` (`features/rafts-api/raft-screen.tsx`), bắt buộc chọn vùng ở bộ lọc (hoặc mở từ tab "Bè nuôi" của vùng). Bảng bè: Mã bè, Số làn, Trạng thái. Bấm dòng mở hồ sơ bè với các tab: Thông tin, Ảnh và làn, Chi phí vật tư (nếu có quyền xem phiếu mua), Chu kỳ nuôi (`raft-detail-panel.tsx`).

### 3.3.1 Thêm bè (FARM-04.0)
1. Chọn vùng -> "Thêm bè nuôi" -> hộp thoại "Thêm bè nuôi" (Vùng <tên>): nhóm "Thông tin bè": Mã bè*, Kích thước*, Số làn đang dùng* (mặc định 1), Vị trí; nhóm "Vị trí trên bản đồ và tình trạng": chọn ghim (có hiện ghim vùng và các bè khác để định hướng), Tình trạng bè.
2. Web kiểm (`raft-model.ts:60`): mã và kích thước bắt buộc; tọa độ hoặc trống cả hai hoặc đủ cả hai ("Chọn đầy đủ vị trí trên bản đồ (vĩ độ)."), trong dải; số làn nguyên ≥ 1 ("Số làn phải là số nguyên từ 1 trở lên.").
3. `POST /api/zones/{zoneId}/rafts` (Owner). Backend (`RaftService.CreateAsync`, Farming/Rafts/RaftService.cs:30):
   - vùng phải In Use, nếu không `409 MSG-GEN-09` ("Farming zone X is Discontinued and cannot be used for this action." qua `NotUsableChoice`);
   - kiểm trường (`RaftValues.Read`, mục 3.4), mã trùng trong vùng -> `409 MSG-GEN-02` "Raft already exists..." kèm `existingId`;
   - tạo bè In Use cùng các làn 1..N (mỗi làn In Use), ghi audit `Raft.Created` (kèm `LaneCount`);
   - phản hồi "Raft saved." kèm `warnings` nếu ghim bè cách ghim vùng > 5 km (đang triển khai).
Ảnh KHÔNG thêm được lúc tạo trên web (SRS FARM-04.0 cho đính tối đa 3 ảnh khi đăng ký): phải tạo bè xong rồi vào tab "Ảnh và làn". ⚠ (A-12)

### 3.3.2 Sửa bè (FARM-04.2)
Tab "Thông tin" -> "Chỉnh sửa". `PUT /api/rafts/{id}` kèm rowVersion (RaftService.cs:98). Chặn: bè hoặc vùng không In Use (`MSG-GEN-09`). Đổi số làn: xem 3.5 quy tắc B3/B4; nếu có chu kỳ mở, TOÀN BỘ lưu bị từ chối với `409 MSG-GEN-06` "Cannot proceed because 1 records are still in use: cultivation cycle started dd/MM/yyyy. Please handle these records first." kèm `cycleId`; người dùng giữ nguyên các nội dung đã nhập và có thể lưu lại với số làn cũ (FARM-04.2.E1). Audit `Raft.Updated` (phần đổi) và `Raft.LanesChanged` (làn bị gỡ/khôi phục/thêm mới).

### 3.3.3 Ảnh bè (FARM-04)
Tab "Ảnh và làn" (`raft-photo-tab.tsx`): chọn tệp JPEG/PNG ≤ 10 MB -> "Lưu ảnh bè". `POST /api/rafts/{id}/photos` (Owner; một ảnh mỗi lần; tối đa 3: ảnh thứ 4 bị `400` "A raft holds at most 3 photos. Remove one first."). Chỉ Owner thấy ô thêm ảnh. Web KHÔNG có nút xóa ảnh dù backend có `DELETE /api/rafts/{id}/photos/{photoId}`. Mỗi lần thêm/xóa ghi audit `Raft.PhotosChanged` và tăng rowVersion của bè.

### 3.3.4 Ngừng / dùng lại bè (FARM-04.3, 04.4)
Tab "Thông tin" -> "Ngừng sử dụng bè" -> xác nhận "Hồ sơ và lịch sử vẫn được giữ.". `POST /api/rafts/{id}/discontinue`: chỉ khi In Use và KHÔNG có chu kỳ mở (không thì `409 MSG-GEN-06` nêu chu kỳ mở). Dùng lại: `POST .../reactivate`, chỉ khi bè Discontinued và vùng In Use (nếu vùng ngừng: `409 MSG-GEN-09` nêu vùng). Giữ nguyên mã, làn, ảnh, lịch sử. Audit `Raft.Discontinued` / `Raft.Reactivated`.

### 3.3.5 Xem trạng thái làn trong ngày (FARM-04.1)
Backend có `GET /api/rafts/{id}/lanes/today` (RaftReadService.cs:61) trả mỗi làn: trạng thái lưu (In Use/Removed) và trạng thái ngày (`NotSeeded, Growing, BeingHarvested, Harvested`). Ví dụ live bè B1-01: làn 1 BeingHarvested, làn 2 Harvested, làn 3 Growing, làn 4 Removed (NotSeeded).
Web KHÔNG gọi endpoint này: tab "Ảnh và làn" chỉ liệt kê "Làn n: Đang sử dụng/Đã gỡ". Trạng thái làn theo ngày xem ở màn Chu kỳ nuôi / Tiến độ (Phần B, dữ liệu từ `/api/rafts/{id}/progress`). ⚠ SRS FARM-04.1 muốn xem ngay trong hồ sơ bè (A-13).

## 3.4 Bảng trường

| Trường | Kiểu | Bắt buộc | Giới hạn / kiểm tra | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| Mã bè `code` | text | Có | 1-50 ký tự (RaftValues.cs:11). Duy nhất TRONG vùng, kể cả bè đã ngừng (index unique `RaftConfiguration`:12). Web cho gõ tới 100 ký tự (`raft-form-fields.tsx:26`) | Gợi ý {mã vùng}-B01.. qua `GET /api/zones/{id}/rafts/next-code` (web chưa dùng; live trả `DEMO-01-B01` dù bè demo đặt tên B1-01) | Danh sách, tiêu đề |
| Kích thước `size` | text tự do | Có | 1-100 ký tự (backend); web cho 300 ký tự. Là chuỗi, ví dụ "10 m x 24 m", KHÔNG phải số | Nhập tay | Danh sách zone, hồ sơ |
| Số làn `laneCount` | số nguyên | Có | 1..200 (`MaxLaneCount`, RaftLaneChange.cs:14). Web chỉ kiểm ≥ 1 | Web mặc định 1 | Cột "Số làn", hồ sơ |
| Vị trí `location` | text | Không | ≤ 500 (web 300) | | Hồ sơ |
| Tình trạng bè `conditionNotes` | text | Không | ≤ 2000 (web 1000) | | Hồ sơ |
| Vĩ độ, kinh độ | số | Không; đi cùng nhau hoặc cùng trống | trong dải; (đang triển khai) không (0,0), không bị đảo; chỉ cảnh báo nếu cách ghim vùng > 5 km | Chọn bằng bản đồ (đang triển khai) | Hồ sơ, bản đồ |
| Ảnh `photos` | tệp | Không | ≤ 3 ảnh (`Raft.MaxPhotos`), JPEG hoặc PNG ≤ 10 MB, lưu nguyên bản; Owner thêm | | Tab Ảnh và làn |
| Trạng thái bè | 101/102 | Hệ thống | Xem 3.5 | In Use khi tạo | Nhãn |
| Làn `lanes[]` | số + trạng thái | Hệ thống | `laneNumber` ≥ 1; trạng thái lưu 2001 In Use, 2002 Removed | Tạo 1..N | Tab Ảnh và làn |
| Chi phí vật tư `materialCost` | VND | Hệ thống | Tổng dòng Material của phiếu mua Completed ghi rõ bè, trừ trả hàng (BR-FARM-05) | Tính | Tab "Chi phí vật tư" |
| Vùng của bè | id | Có | Cố định, không chuyển bè sang vùng khác | Từ vùng đang chọn | Hồ sơ |

Ví dụ live: bè `B1-01` (vùng DEMO-01): kích thước "10 m x 24 m", 3 làn đang dùng và làn 4 đã gỡ, 2 ảnh, chi phí vật tư 3.255.000 VND, tọa độ trùng ghim vùng (21,0712 / 107,4321). Bè `B1-03` chưa có tọa độ (tùy chọn).

## 3.5 Quy tắc và tính toán

| # | Quy tắc | So với SRS |
|---|---|---|
| B1 | Bè thuộc đúng một vùng; không có quyền riêng theo bè (theo zone) | ✔ BR-FARM-01 |
| B2 | Làn đánh số 1..N, số không bao giờ đổi, làn không bị xóa | ✔ BR-FARM-02, 04 |
| B3 | Thêm làn: trước hết khôi phục các làn Removed theo thứ tự số, rồi mới tạo số mới ở cuối | ✔ BR-FARM-04 (`RaftLaneChange.To`, RaftLaneChange.cs:16) |
| B4 | Bớt làn: đánh dấu Removed các làn In Use có số lớn nhất; làn Removed giữ nguyên hồ sơ cũ | ✔ BR-FARM-04 |
| B5 | Chỉ đổi số làn khi bè KHÔNG có chu kỳ mở (`RaftService.cs:127`). Nếu bị chặn, các sửa đổi khác vẫn lưu được nếu giữ số làn cũ | ✔ FARM-04.2.E1 |
| B6 | Không ngừng được bè đang có chu kỳ mở (MSG-GEN-06) | ✔ FARM-04.3.E1 |
| B7 | Không thêm bè vào vùng đã ngừng; không dùng lại bè khi vùng đang ngừng (MSG-GEN-09) | ✔ GBR-01 |
| B8 | Bè đã ngừng hoặc vùng ngừng: chỉ xem, không sửa, không thêm/xóa ảnh (`EditRefusal`, RaftViews.cs:62) | ✔ |
| B9 | Mã bè duy nhất trong vùng, đổi mã bè được; mã vùng đổi không kéo theo mã bè | ✔ GBR-03 |
| B10 | Số làn tối đa 200 (chống gõ nhầm tạo hàng nghìn làn) | ➕ |
| B11 | Kích thước là văn bản tự do, không tính được mật độ/diện tích | ➕ (rà soát 11/11 đã ghi) |
| B12 | Trạng thái làn trong ngày: tính, không lưu (`LaneStateRules.StatesOn`, Cultivation/Progress/LaneStateRules.cs) | ✔ BR-FARM-03 |
| B13 | Thêm ảnh/xóa ảnh/sửa làn đều "chạm" bản ghi bè nên tăng rowVersion: hai người thao tác cùng lúc sẽ báo xung đột | ✔ |

### Trạng thái bè và vùng

```
      [Tạo mới]
          |
          v
   In Use  --(Ngừng: không có chu kỳ mở / vùng: không còn bè In Use)-->  Discontinued
     ^                                                                        |
     |------(Dùng lại: bè chỉ khi vùng In Use; vùng luôn được)---------------|
```

### Trạng thái lưu của làn (do số làn quyết định)
```
In Use  --(bớt làn, không có chu kỳ mở, làn có số lớn nhất)-->  Removed
Removed --(thêm làn: khôi phục theo thứ tự số)---------------->  In Use
```

### Trạng thái làn trong ngày (tính từ chu kỳ đang mở tại ngày xem, BR-FARM-03)
Nếu không có chu kỳ nào mở tại ngày đó: mọi làn là NotSeeded.
```
NotSeeded --(có buổi gieo tính đến ngày xem)--> Growing
Growing   --(làn vào một lô thu hoạch)---------> BeingHarvested
BeingHarvested --(lô thu hoạch đánh dấu làn "đã thu xong")--> Harvested
(ưu tiên khi tính: Harvested > BeingHarvested > Growing > NotSeeded)
```
Chỉ làn Growing hoặc BeingHarvested được chọn cho lô thu hoạch mới (`LaneStateRules.CanBeHarvested`). Chu kỳ được đóng "bình thường" khi có ít nhất một làn đã gieo và mọi làn đã gieo đều Harvested. Chi tiết gieo/thu hoạch ở Phần B.

## 3.6 Liên kết
- Từ bè sang: Chu kỳ nuôi (tab, `/farming/cycles?zoneId=&raftId=`), Chi phí vật tư (phiếu mua có ghi bè), Nhật ký, Gieo giống, Thu hoạch (Phần B), Phép đo nước (bè = nơi đo).
- Tới bè từ: bản đồ vùng ("Xem bè"), tab Bè nuôi của vùng, phiếu mua hàng (lọc theo bè, danh sách mã bè chỉ-mã cho Accountant), phép đo nước (chọn bè In Use của vùng).
- Bè đã ngừng không được chọn khi bắt đầu chu kỳ mới và không được chọn làm "nơi đo" mới, nhưng phép đo cũ giữ tên bè.

## 3.7 Câu hỏi cho chủ (Bè và làn)
A-6. Tọa độ (đang triển khai): backend đã sẵn cảnh báo "ghim ngoài Việt Nam" và "ghim bè cách vùng > 5 km" nhưng web không hiện. Anh/chị có muốn hiện cảnh báo sau khi lưu không? Ngưỡng 5 km đã đúng với thực tế vùng của HTX chưa (ví dụ vùng rộng 12,5 ha thì bè xa nhất cách bao nhiêu)?
A-12. Ảnh bè: SRS cho gắn tới 3 ảnh ngay khi đăng ký bè, web yêu cầu tạo bè trước rồi thêm ảnh sau, và không có nút xóa ảnh. Muốn bổ sung hai điểm này không?
A-13. Hồ sơ bè nên hiện ngay trạng thái làn hôm nay (Chưa thả / Đang nuôi / Đang thu / Đã thu) như SRS FARM-04.1, hiện web chỉ hiện "đang sử dụng/đã gỡ"?
A-14. Quyền xem bè: ZM xem bè trong zone mình (khác ma trận SRS "No" nhưng cần cho các màn khác). Accountant bị chặn, nhưng web vẫn hiện tab "Bè nuôi" với Accountant rồi báo lỗi. Nên ẩn tab cho Accountant.
A-15. "Kích thước" là chữ tự do ("10 m x 24 m"). Có cần tách thành dài x rộng (số) để tính mật độ nuôi không?
A-16. Mã bè sửa được bất cứ lúc nào (kể cả khi bè đang có chu kỳ mở, đã có phiếu thu, QR). Mã in trên nhãn/QR có bị ảnh hưởng không? Có muốn khóa mã sau khi bè có chu kỳ không?
A-17. Khi giảm số làn, hệ thống gỡ các làn số lớn nhất. Một làn số lớn đang có chu kỳ đã đóng nhưng còn lô chưa bán vẫn bị gỡ (hồ sơ cũ giữ). Chấp nhận được không?
A-18. Số làn tối đa 200: có hợp lý với bè thực tế (thường vài chục làn) không? Có cần chặn kích thước theo diện tích vùng không?

---

# 4. QUAN TRẮC NƯỚC (Water measurement)

## 4.1 Mục đích
Ghi nhận định kỳ (mỗi tháng trong thời gian nuôi) pH, độ mặn, nhiệt độ nước của vùng, có ảnh đồng hồ làm bằng chứng; so với ngưỡng của vùng; báo Owner và Zone Manager khi vượt ngưỡng; theo dõi lịch sử, biểu đồ; sửa/hủy khi nhập sai; nhắc đo khi quá một tháng chưa đo.

## 4.2 Ai dùng, quyền
Owner: xem, ghi, sửa/hủy mọi phép đo Active, xuất file, ĐẶT ngưỡng. Zone Manager: xem/ghi/xuất trong zone của mình, sửa/hủy CHỈ phép đo mình đã ghi, xem (không đặt) ngưỡng. Accountant: không có quyền. Xem mục 0.2.

## 4.3 Luồng từng bước

Màn hình: "Theo dõi chất lượng nước" (`/operations/water`, `water-screen.tsx`). Chưa chọn vùng: lưới "Tổng quan chất lượng nước theo vùng" (mỗi vùng một thẻ: mã, tên, trạng thái, giờ đo gần nhất, huy hiệu "Đang cảnh báo/Không cảnh báo", các giá trị vượt ngưỡng; ba số tổng: Số vùng, Vùng đang cảnh báo, Vùng chưa đo gần đây). Chọn vùng ở bộ lọc trái hoặc bấm thẻ: bảng phép đo của vùng, kèm hai nút mở/đóng "Biểu đồ xu hướng" và "Ngưỡng cảnh báo". Bấm một dòng mở hồ sơ phép đo tại chỗ (tab Thông tin, tab Hình ảnh).

### 4.3.1 Tổng quan theo vùng (WATER-03 bước 1)
`GET /api/water-measurements/zones` (`WaterZoneOverviewService`). Mỗi vùng quyền xem: giờ đo của phép đo ACTIVE mới nhất (theo giờ đo, không theo giờ lưu) và cảnh báo hiện hành: tính tại chỗ từ phép đo đó với ngưỡng đã lưu kèm nó; không lưu (BR-WATER-04). Vùng ngừng không tính cảnh báo. Live hôm nay: DEMO-01 và DEMO-02 cùng đo lần cuối 10/11/2026 06:40, không cảnh báo; DEMO-03 chưa có phép đo.

### 4.3.2 Ghi phép đo (WATER-01) - hai bước
Hiện web CHƯA có nút "Ghi phép đo" nào trên màn Theo dõi chất lượng nước. Component `NewMeasurement` (`water-new-measurement-dialog.tsx:29`) và đường BFF `record`/`recognize` đã có nhưng chưa được gắn vào màn hình nào (đã tìm trong `src`). Quy trình dưới đây là hợp đồng backend/SRS (mobile hoặc khi gắn nút web):
1. Chọn vùng (In Use), chụp/chọn ảnh đồng hồ (JPEG/PNG ≤ 10 MB).
2. `POST /api/zones/{zoneId}/water-measurements/recognize` (multipart, ≤ 12 MB) - `WaterMeasurementRecordingService.RecognizeAsync` (WaterMeasurementRecordingService.cs:39): vùng phải In Use và có ít nhất một bè In Use (nếu không `400 MSG-GEN-01` trường "Zone" hoặc "Raft"); lưu ảnh nguyên bản vào thư mục của tài khoản; gọi dịch vụ OCR, có giới hạn thời gian; trả `photoKey`, gợi ý pH/độ mặn/nhiệt độ/thời gian (kèm độ tin cậy, cờ "chưa chắc"), và nếu giá trị đọc được đã vượt ngưỡng thì kèm cảnh báo MSG-WATER-02 "<giá trị vượt ngưỡng>. Please check the meter again before you save." Nếu OCR lỗi hoặc không đọc được chỉ số nào: MSG-WATER-01 "OMTS could not read pH and salinity from the photo. Please look at the meter and type in the missing values."; người dùng gõ tay. Giá trị OCR ngoài dải hợp lệ coi như không đọc được. KHÔNG lưu phép đo nào ở bước này (AC-04).
3. Người dùng chọn bè (bè In Use của vùng), kiểm/sửa từng giá trị và thời điểm đo (mặc định giờ hiện tại), rồi "Lưu phép đo".
4. `POST /api/zones/{zoneId}/water-measurements` (JSON), `RecordAsync` (:75). Backend:
   - nếu `clientOperationId` đã dùng bởi cùng tài khoản: trả lại bản ghi đã lưu (HTTP 200), không tạo bản mới, không báo lại; cùng id cho vùng khác -> `400 "Client operation id"`;
   - vùng In Use; mọi trường bắt buộc và trong dải; bè thuộc đúng vùng và In Use; ảnh phải là ảnh của chính tài khoản, chưa dùng cho phép đo khác và còn tồn tại. Có lỗi thì trả một `400 MSG-GEN-01` liệt kê trường ("pH", "Salinity", "Temperature", "Measured at", "Raft", "Photo");
   - tạo phép đo trạng thái Active, người ghi = tài khoản đang đăng nhập, SAO CHÉP ngưỡng hiện hành của vùng vào phép đo (`CopyTo`, :133); tính vượt ngưỡng ngay (`Recheck`); nếu có giá trị vượt: gửi thông báo cảnh báo (mục 4.5 W9); ghi audit `WaterMeasurement.Created`;
   - trả 201 với chi tiết phép đo.
   Nếu mất mạng giữa chừng: web giữ nguyên dữ liệu đang nhập và dùng lại cùng `clientOperationId` khi gửi lại, nên không tạo đôi.

### 4.3.3 Xem lịch sử, biểu đồ, xuất file (WATER-03)
- Lịch sử: `GET /api/zones/{id}/water-measurements?from=&to=&status=&page=&pageSize=`. Mặc định 3 tháng gần nhất, cả Active lẫn Voided; `from` không sau `to`; ngày từ 01/01/2000 đến hôm nay + 1 năm (nếu sai: `400 MSG-GEN-01` "From"/"To"); không có dữ liệu: MSG-GEN-10 "There is no data for the zone and period you chose. Please choose again." Web đọc hết các trang (100 dòng/trang, tối đa 30 trang) rồi lọc theo bè, "chỉ số vượt ngưỡng", tìm theo bè/người ghi, sắp xếp, phân trang ngay trên trình duyệt; bộ lọc trạng thái mặc định "Đang hiệu lực". Nếu quá nhiều: "Chỉ hiển thị N phép đo mới nhất; hãy thu hẹp khoảng thời gian."
- Cột bảng: Thời điểm đo, Vùng, Bè, pH, Độ mặn (‰), Nhiệt độ (°C), Cảnh báo ("Vượt ngưỡng/Trong ngưỡng"), Trạng thái, Người ghi.
- Biểu đồ: `GET .../chart` chỉ lấy phép đo Active, điểm thô theo thời gian kèm ngưỡng hiện hành; web gộp theo Ngày/Tháng, mặc định 12 tháng nếu chưa chọn mốc, hiện biểu đồ pH và độ mặn có dải ngưỡng, và bảng số liệu theo kỳ (trung bình/min/max/số lần đo cho cả nhiệt độ). Biểu đồ KHÔNG vẽ nhiệt độ. ⚠ (A-22)
- Xuất file: nút "Xuất file" (cần quyền Export) -> `GET .../export` -> `water-{mã vùng}-{từ}-{đến}.xlsx`, một sheet "Measurements" gồm: Measured at, Raft, pH, Salinity (‰), Temperature (°C), Status, Void reason, Alert, Violated values, Measured by, và 6 cột ngưỡng đã dùng.

### 4.3.4 Hiệu chỉnh phép đo (WATER-02)
1. Mở dòng phép đo (trạng thái Active) -> tab "Thông tin" -> "Hiệu chỉnh" (chỉ hiện nếu có quyền Sửa và phép đo còn Active).
2. Có thể đổi: bè (bè In Use khác cùng vùng), thời điểm, pH, độ mặn, nhiệt độ; BẮT BUỘC "Lý do hiệu chỉnh" (≤ 1000 ký tự). Không đổi được vùng, ảnh, ngưỡng.
3. `POST /api/water-measurements/{id}/corrections` (WaterMeasurementCorrectionService.cs:67). Backend kiểm: người làm là chủ phép đo hoặc là Owner (nếu không `403 MSG-GEN-08`); phép đo phải Active (nếu không `409 MSG-GEN-09` "Water measurement is Voided and cannot be used for this action."); vùng In Use (nếu không `409 MSG-GEN-09` về vùng); giá trị như ghi mới; bè: giữ bè cũ (kể cả bè đã ngừng) hoặc chọn bè In Use khác trong cùng vùng; lý do không trống.
4. Cập nhật CÙNG bản ghi (không tạo bản mới), tính lại vượt ngưỡng theo NGƯỠNG ĐÃ LƯU CỦA CHÍNH phép đo (không đổi), gửi/rút cảnh báo nếu kết quả của phép đo mới nhất thay đổi (4.5 W10), audit `WaterMeasurement.Corrected` kèm trước/sau và lý do. Nước không có kiểm phiên bản: ghi đè theo lần lưu sau; hai người cùng sửa được thực hiện lần lượt.

### 4.3.5 Hủy phép đo (WATER-02.1)
"Hủy bỏ phép đo" -> hộp "Hủy bỏ phép đo?" nhập lý do -> `POST /api/water-measurements/{id}/void`. Đổi trạng thái Active -> Voided (cuối cùng, không khôi phục), lưu lý do, audit `WaterMeasurement.Voided`. Phép đo Voided vẫn nằm trong lịch sử kèm lý do nhưng không vào biểu đồ, không tính cảnh báo hiện hành, không tính nhắc quá hạn. Ghi nhầm vùng thì hủy rồi ghi lại.

### 4.3.6 Ngưỡng cảnh báo (WATER-04) - mục này là "ngưỡng của vùng"
1. Màn nước, chọn vùng -> "Ngưỡng cảnh báo" -> lưới 6 ô: pH tối thiểu/tối đa, Độ mặn tối thiểu/tối đa (‰), Nhiệt độ tối thiểu/tối đa (°C). Owner sửa được, người khác chỉ xem ("Chỉ Chủ hợp tác xã được thay đổi ngưỡng.").
2. Hộp chọn "Áp dụng cho tất cả vùng đang sử dụng" -> xác nhận "Áp dụng các ngưỡng này cho tất cả vùng đang dùng?".
3. `PUT /api/zones/{zoneId}/water-thresholds` (một vùng) hoặc `PUT /api/water-thresholds` (mọi vùng In Use). Web luôn gửi đủ 6 khóa (ô trống = null) vì backend xóa cặp bị bỏ qua.
4. Backend (`WaterThresholdRules.Validate`, WaterThresholdRules.cs:20): mỗi chỉ số hoặc có đủ min và max hoặc trống cả hai; giá trị trong dải của chỉ số; tối đa 2 số lẻ; min PHẢI nhỏ hơn max (bằng cũng sai). Lỗi dải: `400 MSG-GEN-01` ("pH minimum is missing or invalid..."). Lỗi min ≥ max: `400` MSG-WATER-05 "The minimum of pH must be less than the maximum. The thresholds were not saved. Please correct the values."; giữ ngưỡng cũ. Vùng ngừng: `409 MSG-GEN-09`. Chỉ ghi audit `WaterThreshold.Updated` (trước/sau) nếu giá trị thực sự đổi, mỗi vùng một dòng khi áp dụng hàng loạt.
5. Ngưỡng mới chỉ áp dụng cho phép đo ghi SAU đó; phép đo cũ giữ ngưỡng đã lưu kèm nó (web nhắc: "Ngưỡng mới chỉ áp dụng cho phép đo ghi sau khi lưu; phép đo và cảnh báo cũ giữ ngưỡng đã dùng.").

### 4.3.7 Nhắc đo nước quá hạn (GFR-04)
Công việc chạy hằng ngày (`WaterMeasurementOverdueJob`). Xem quy tắc W11. Thông báo "Zone <tên> has had no water measurement since <ngày>. Please measure the water and record the result in OMTS." (MSG-WATER-06).

## 4.4 Bảng trường

### Phép đo nước

| Trường | Kiểu | Bắt buộc | Giới hạn / kiểm tra | Mặc định / nguồn | Hiển thị |
|---|---|---|---|---|---|
| Vùng `zoneId` | id | Có | Vùng In Use; không đổi được sau khi ghi | Chọn vùng | Bảng, hồ sơ |
| Bè `raftId` ("nơi đo") | id | Có | Bè In Use thuộc đúng vùng (`RaftField`). Sửa: giữ bè cũ hoặc bè In Use khác cùng vùng | Chọn | Cột "Bè" |
| Thời điểm đo `measuredAt` | ngày giờ | Có | ≥ 00:00 ngày 01/01/2000 (giờ VN) và ≤ bây giờ + 5 phút (`WaterValueRules.IsValidMeasuredAt`, WaterValueRules.cs:29/15). Không có giới hạn lùi quá khứ khác | Giờ hiện tại hoặc giờ OCR đọc | Cột "Thời điểm đo" |
| pH | số | Có | 0..14, tối đa 2 số lẻ (WaterValueRules.cs:9) | OCR gợi ý, người dùng xác nhận | Cột pH |
| Độ mặn (‰) | số | Có | 0..50 (backend). Web đặt nhãn "0-100 ‰" và schema max 100 (`features/operations/contracts.ts:79`) nên 51..100 qua web nhưng backend từ chối | như trên | Cột độ mặn |
| Nhiệt độ (°C) | số | Có | 0..45 (backend). Web max 100 như trên | như trên | Cột nhiệt độ |
| Ảnh đồng hồ `photoKey` | khóa tệp | Có | Ảnh của chính tài khoản, chưa dùng, từ bước `recognize`. Mỗi ảnh chỉ một phép đo (index unique) | `recognize` | Tab "Hình ảnh" |
| Mã thao tác `clientOperationId` | uuid | Không (server tự sinh) | Chống tạo đôi khi gửi lại | Web sinh khi mở hộp thoại | Ẩn |
| Ngưỡng đã dùng (6 số) | số | Hệ thống | Bản sao ngưỡng vùng lúc lưu; không đổi khi sửa | Từ vùng | Bảng "Giá trị và ngưỡng đã dùng khi ghi phép đo" |
| Vượt ngưỡng `thresholdExceeded`, `violatedValues` | cờ, chuỗi | Hệ thống | Ví dụ "pH 8.72 > 8.50" | Tính lại khi ghi/sửa | Cột "Cảnh báo", dòng "Vượt ngưỡng:" |
| Trạng thái | ACTIVE / VOIDED | Hệ thống | Xem 4.5 | Active khi ghi | Cột "Trạng thái" |
| Lý do hủy `voidReason` | text | Khi hủy | 1-1000 ký tự | | Hồ sơ |
| Người ghi `measuredBy` | tài khoản | Hệ thống | | Người đăng nhập | Cột "Người ghi" |
| Thời điểm gửi cảnh báo `alertedAt` | ngày giờ | Hệ thống | Xóa khi hết vượt ngưỡng | | Hồ sơ |
| Lý do hiệu chỉnh | text | Khi sửa | 1-1000 ký tự | | Audit |

### Ngưỡng của vùng

| Trường | Kiểu | Bắt buộc | Giới hạn | Mặc định | Hiển thị |
|---|---|---|---|---|---|
| pH min / max | số | Cả cặp hoặc trống cả cặp | 0..14, ≤ 2 số lẻ, min < max | Trống ở vùng mới | Ngưỡng cảnh báo, tab Quan trắc nước của vùng |
| Độ mặn min / max (‰) | số | như trên | 0..50 (backend; web 0..100), min < max | Trống | như trên |
| Nhiệt độ min / max (°C) | số | như trên | 0..45 (backend; web 0..100), min < max | Trống | như trên |

Ví dụ live: cả DEMO-01 và DEMO-02 đang đặt pH 7,5-8,5; độ mặn 18-32 ‰; nhiệt độ 15-32 °C.

## 4.5 Quy tắc và tính toán

| # | Quy tắc | So với SRS |
|---|---|---|
| W1 | Đo theo VÙNG; bè chỉ ghi nơi đo; vùng không có điểm đo cố định; chỉ vùng và bè In Use được chọn | ✔ BR-WATER-01 |
| W2 | Mỗi phép đo có đúng một ảnh đồng hồ, bắt buộc; giá trị OCR chỉ là gợi ý, hệ thống chỉ lưu giá trị người dùng xác nhận và KHÔNG lưu giá trị gợi ý | ✔ BR-WATER-02 |
| W3 | Dải hợp lệ: pH 0..14; độ mặn 0..50 ‰; nhiệt độ 0..45 °C; thời điểm không muộn hơn hiện tại (sai lệch đồng hồ cho phép 5 phút). Các dải này SRS tự đánh dấu "(A)" = giả định cần xác nhận | ✔ BR-WATER-03 (cần chủ xác nhận) |
| W4 | Mỗi vùng một bộ ngưỡng (min, max cho mỗi chỉ số); chỉ số không có ngưỡng thì KHÔNG kiểm; vùng mới chưa có ngưỡng nên chưa có cảnh báo cho tới khi Owner đặt | ✔ BR-WATER-04 |
| W5 | Vượt ngưỡng khi một giá trị NHỎ HƠN min hoặc LỚN HƠN max; bằng đúng biên là trong ngưỡng (`WaterThresholdEvaluator.Check`, WaterThresholdEvaluator.cs:44) | ✔ |
| W6 | Khi lưu, phép đo mang theo BẢN SAO ngưỡng của vùng; đổi ngưỡng hay sửa phép đo sau này KHÔNG đổi ngưỡng đã lưu | ✔ BR-WATER-04, 06 |
| W7 | "Cảnh báo của vùng" = phép đo ACTIVE có thời điểm đo MỚI NHẤT của vùng (không phải giờ lưu) đang vượt ngưỡng của chính nó; không lưu, tính lại mỗi lần hiển thị; sửa/hủy có thể làm đổi. Dùng cho tổng quan, bảng điều khiển (BR-FARM-10) | ✔ BR-WATER-04 |
| W8 | Phép đo Voided: không vào biểu đồ, không tính cảnh báo hiện hành, không tính nhắc quá hạn; không khôi phục | ✔ BR-WATER-06 |
| W9 | Khi LƯU phép đo có giá trị vượt ngưỡng: gửi thông báo MSG-WATER-03 "Water alert: zone <tên>, raft <mã>, measured on <giờ>. <ví dụ: Salinity 12 ‰ is too low (allowed 15-30 ‰)>. Please check the water." cho mọi Owner đang hoạt động và các Zone Manager của vùng, TRỪ Owner đã tự làm hành động đó (quyết định PM 03/11). Loại WATER_ALERT, luôn đẩy. Gửi cả khi phép đo được ghi lùi ngày cũ (không phải phép đo mới nhất) | ⚠ SRS BR-WATER-05 gửi cho Owner và ZM của vùng, không loại Owner người ghi |
| W10 | Sau SỬA hoặc HỦY, CHỈ khi phép đo đó là phép đo Active mới nhất của vùng VÀ tập (chỉ số, hướng cao/thấp) vượt ngưỡng thay đổi thì mới gửi: còn vượt -> cảnh báo mới ghi "(corrected measurement)"; hết vượt hoặc bị hủy -> MSG-WATER-04 "The water alert of zone <tên> (measured on <giờ>) was withdrawn: <người làm> corrected|voided the measurement. Reason: <lý do>." Sửa đổi giá trị nhưng cùng phía (9,1 -> 9,3) hoặc sửa phép đo cũ: không gửi gì (`WaterCorrectionNoticeRule`, WaterCorrectionNoticeRule.cs:27,37) | ✔ BR-WATER-05 |
| W11 | Nhắc quá hạn đo: mỗi ngày kiểm từng vùng In Use có ít nhất một bè có chu kỳ Mở. Ngày gốc = ngày LỚN HƠN giữa (ngày đo của phép đo Active mới nhất, ngày bắt đầu của chu kỳ Mở sớm nhất); vùng quá hạn khi ngày gốc + 1 tháng < hôm nay; nhắc lại mỗi tháng nếu vẫn chưa có phép đo mới. Ví dụ trong mã: gốc 23/09 thì 23/10 còn đúng hạn, từ 24/10 quá hạn, nhắc lần sau 24/11 (`WaterOverdueRule`, WaterOverdueRule.cs:13,20). Người nhận: các Zone Manager của vùng, nếu không có ZM thì Owner | ✔ GFR-04, MSG-WATER-06. Khác nhỏ: SRS đọc "đã nhắc" từ bảng thông báo, mã lưu mốc "đã nhắc" ngay trên bản ghi vùng ⚠ không ảnh hưởng người dùng |
| W12 | Ai được sửa/hủy: Zone Manager chỉ phép đo mình ghi, trong zone mình còn quyền; Owner mọi phép đo Active; chỉ phép đo Active của vùng In Use; bắt buộc lý do | ✔ BR-WATER-06 |
| W13 | Vùng đã ngừng: phép đo chỉ xem; không đặt ngưỡng, không ghi, không sửa | ✔ GBR-01 |
| W14 | Mất mạng hoặc bấm gửi hai lần không tạo hai phép đo (mã thao tác + mỗi ảnh một phép đo) | ➕ (SRS yêu cầu ghi khi có mạng) |
| W15 | Đặt ngưỡng cho TẤT CẢ vùng In Use cùng lúc | ➕ (SRS: từng vùng) |
| W16 | Không có kiểm tra phép đo trùng (cùng bè, cùng giờ), không kiểm biến thiên bất thường so với lần trước | ➕ không có |

### Trạng thái phép đo

```
          [Ghi phép đo]
               |
               v
            ACTIVE  --(Hiệu chỉnh, cần lý do; vẫn ACTIVE, ghi trước/sau)-->  ACTIVE
               |
               |--(Hủy, cần lý do)-->  VOIDED   (cuối cùng; còn trong lịch sử, bị loại khỏi biểu đồ/cảnh báo)
```

### Cảnh báo của vùng (tính, không lưu)

```
phép đo ACTIVE mới nhất của vùng (theo giờ đo)
   -> so sánh từng giá trị với NGƯỠNG ĐÃ LƯU CỦA CHÍNH phép đo
        thấp hơn min hoặc cao hơn max -> vượt     (biên đúng = không vượt; chỉ số không có ngưỡng = không kiểm)
   -> có >= 1 giá trị vượt  => vùng "Đang cảnh báo"
```
Ví dụ live (vùng DEMO-02): phép đo 07/11/2026 06:30 ở bè B2-05 có pH 7,32 < 7,50 là vượt, nhưng vì phép đo mới nhất của vùng là 10/11/2026 trong ngưỡng nên hiện "Không cảnh báo". Phép đo `f429c221` ngày 01/11/2026 ở B2-03 đã bị Void với lý do "Máy đo pH chưa được hiệu chuẩn lại, kết quả đo không dùng được." nên không tính.

## 4.6 Liên kết
- Vùng -> tab "Quan trắc nước" (5 lần đo gần nhất, ngưỡng đang áp dụng, nút "Mở theo dõi chất lượng nước") và chip "Nước:" trên hồ sơ vùng; cột "Phép đo nước gần nhất" trong danh sách vùng.
- Hộp thư/thông báo mở bản ghi phép đo (`record-dialog`).
- Bảng điều khiển Owner (FARM-06): ô "Water alerts" đếm vùng đang cảnh báo; bấm mở màn nước của vùng.
- Phép đo ghi tên bè (nơi đo). Bè ngừng vẫn hiện trên phép đo cũ.

## 4.7 Câu hỏi cho chủ (Quan trắc nước)
A-19. Dải hợp lệ do SRS tự đánh dấu "(A)": pH 0-14, độ mặn 0-50 ‰, nhiệt độ 0-45 °C. Web đang cho nhập tới 100 cho độ mặn và nhiệt độ nên người dùng nhập 60 sẽ qua web nhưng bị backend từ chối với thông báo chung. Anh/chị xác nhận dải thực tế cho HTX (ví dụ hàu thường nuôi ở 15-35 ‰?) để sửa đồng bộ.
A-20. Cảnh báo chỉ so với ngưỡng đã lưu lúc đo. Vùng mới chưa đặt ngưỡng thì không bao giờ có cảnh báo. Có muốn mặc định ngưỡng chung của HTX khi tạo vùng, hoặc nhắc Owner đặt ngưỡng không?
A-21. Hiện web không có nút "Ghi phép đo" (chỉ sửa/hủy/xem). Có đúng là chỉ ghi phép đo trên ứng dụng di động ngoài bè không? Nếu muốn ghi từ web cần gắn nút (đã có sẵn hộp thoại).
A-22. Biểu đồ chỉ vẽ pH và độ mặn; nhiệt độ chỉ có trong bảng. Có muốn vẽ cả nhiệt độ không?
A-23. Thông báo cảnh báo hiện không gửi cho Owner khi chính Owner ghi (quyết định 03/11). SRS vẫn viết gửi cho Owner. Giữ quyết định này?
A-24. Cho phép ghi phép đo lùi ngày không giới hạn (từ 2000). Có muốn giới hạn (ví dụ tối đa 7 ngày) hoặc yêu cầu lý do khi lùi ngày xa? Phép đo lùi ngày vượt ngưỡng vẫn gửi cảnh báo dù không phải mới nhất.
A-25. Màn "tổng quan vùng" của web đánh dấu "Chưa đo gần đây" khi quá 24 GIỜ (hằng số tự đặt của web, ghi rõ "chưa có quy tắc nghiệp vụ chốt"), trong khi quy tắc nhắc của hệ thống là 1 THÁNG. Tần suất đo thật sự là bao lâu? Nếu 1 tháng thì nhãn 24 giờ làm hầu hết vùng bị gắn "chưa đo gần đây".
A-26. Tab "Quan trắc nước" của hồ sơ vùng lấy "lần đo gần nhất" là dòng đầu của danh sách (gồm cả phép đo ĐÃ HỦY), trong khi định nghĩa nghiệp vụ là phép đo ACTIVE mới nhất. Nếu phép đo mới nhất bị hủy, tab và chip "Nước:" sẽ hiện giá trị của phép đo đã hủy (cột Cảnh báo ghi "Đã hủy" ở bảng nhưng ô "Cảnh báo" bên trái lại tính từ giá trị). Cần sửa để lấy Active mới nhất.
A-27. Mặc định lịch sử là 3 tháng (không phải "từ đầu tháng" như SRS WATER-03.1 khi mở từ thông báo). Chấp nhận?
A-28. Nhắc quá hạn gửi cho Zone Manager của vùng, nhưng nếu ZM không ở trong vùng có chu kỳ mở của họ thì sao? Hiện đúng như SRS; không có câu hỏi thêm ngoài việc Owner có muốn luôn nhận bản sao nhắc không.

---

# 5. THÔNG BÁO PHÁT SINH TỪ PHẦN NÀY (tóm tắt)

| Sự kiện | Người nhận | Loại / mã tin | Khi nào | Ghi chú |
|---|---|---|---|---|
| Giấy phép sắp hết hạn | Owner | ZONE_LICENSE_EXPIRY, MSG-FARM-01 | Khi còn ≤ 30 ngày, một lần | Chỉ vùng In Use, giấy chưa Replaced (⚠ SRS: chỉ giấy mới nhất) |
| Giấy phép hết hạn | Owner | ZONE_LICENSE_EXPIRY, MSG-FARM-02 | Khi quá hạn, một lần | Đổi ngày hết hạn nạp lại |
| Phép đo vượt ngưỡng | Owner (trừ người tự ghi nếu là Owner) + Zone Manager của vùng | WATER_ALERT, MSG-WATER-03 (luôn đẩy) | Lúc lưu phép đo | |
| Hiệu chỉnh làm kết quả đổi | như trên | WATER_ALERT "(corrected measurement)" | Khi sửa phép đo Active mới nhất | |
| Rút cảnh báo | như trên | WATER_ALERT_WITHDRAWN, MSG-WATER-04 | Sau sửa/hủy phép đo mới nhất làm hết vượt | |
| Quá một tháng chưa đo | Zone Manager của vùng (nếu không có thì Owner) | WATER_MEASUREMENT_OVERDUE, MSG-WATER-06 | Hằng ngày, nhắc lại mỗi tháng | |

Zone, bè, làn: KHÔNG phát sinh thông báo khi tạo, sửa, ngừng, dùng lại.

# 6. NHẬT KÝ KIỂM TOÁN (audit) cho phần này

| Hành động | Mã audit | Ghi gì |
|---|---|---|
| Tạo / sửa vùng | FarmingZone.Created / .Updated | Giá trị sau / chỉ phần đổi trước-sau |
| Ngừng / dùng lại vùng | FarmingZone.Discontinued / .Reactivated | Trạng thái cũ-mới, lý do (nếu có) |
| Tạo / sửa bè | Raft.Created / .Updated | Giá trị và số làn |
| Đổi số làn | Raft.LanesChanged | Số làn trước/sau, làn gỡ, khôi phục, tạo mới |
| Thêm/xóa ảnh bè | Raft.PhotosChanged | Danh sách khóa ảnh trước/sau |
| Ngừng / dùng lại bè | Raft.Discontinued / .Reactivated | Như vùng |
| Tạo / sửa / thay thế giấy phép | ZoneLicense.Created / .Updated / .Replaced | Giá trị, kèm số giấy cũ khi thay thế |
| Ghi phép đo | WaterMeasurement.Created | Giá trị đầy đủ |
| Sửa / hủy phép đo | WaterMeasurement.Corrected / .Voided | Trước/sau + lý do |
| Đặt ngưỡng | WaterThreshold.Updated | Trước/sau, một dòng mỗi vùng (chỉ khi đổi) |
| Xem, xuất | (không ghi) | |

---

# 7. DANH SÁCH CÂU HỎI TỔNG HỢP, SẮP THEO MỨC QUAN TRỌNG

Quy tắc nghiệp vụ nghi vấn nhất (nên trả lời trước):
1. A-7 / A-8 (Giấy phép): nhắc hết hạn cho mọi giấy chưa thay thế (khác SRS) và khoảng trống pháp lý khi giấy thay thế hiệu lực sau.
2. A-19 (Nước): dải hợp lệ độ mặn, nhiệt độ (SRS tự gắn "(A)"), web đang cho rộng hơn backend.
3. A-25 / A-26 (Nước, web): "chưa đo gần đây" tính 24 giờ trong khi quy tắc nhắc là 1 tháng; "lần đo gần nhất" có thể là phép đo đã hủy.
4. A-5 (Giấy phép): giấy hết hạn không chặn hay cảnh báo nghiệp vụ nào khác.
5. A-20 (Nước): vùng mới không có ngưỡng thì không bao giờ cảnh báo.
6. A-23 / A-24 (Nước): Owner không nhận cảnh báo do chính mình ghi (khác SRS); ghi lùi ngày không giới hạn.
7. A-1, A-2, A-3, A-4 (Vùng): mã đề xuất, diện tích, lý do ngừng, quyền xem của Accountant.
8. A-12..A-18 (Bè và làn): ảnh khi tạo/xóa ảnh, trạng thái làn trên hồ sơ bè, kích thước là chữ tự do, sửa mã bè, ngưỡng 200 làn.

Lỗi hiển thị web đã xác nhận bằng dữ liệu thật (không phải quy tắc nghiệp vụ, nhưng chủ sẽ thấy):
- Vùng có giấy phép tốt (DEMO-02) hiện "Thiếu hồ sơ"; bộ lọc "Còn hiệu lực/Thiếu hồ sơ" sai theo.
- Web không có nút ghi phép đo; không có nút xóa ảnh bè; không hiện cảnh báo tọa độ; không dùng mã đề xuất.
- Giới hạn độ dài ô nhập ở web lớn hơn backend (mã vùng/bè 100 so với 50; kích thước bè 300 so với 100) nên có thể nhận lỗi chung từ backend.

Mọi mục "(đang triển khai)" ở mục 0.4 chưa được coi là hoàn tất.
