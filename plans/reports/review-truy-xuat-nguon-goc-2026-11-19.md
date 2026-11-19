# Review Truy xuất nguồn gốc (web + backend) - 2026-11-19

Phạm vi: màn truy xuất lô nội bộ, trang nguồn gốc công khai theo QR, QR trên hóa đơn, chứng nhận, claim, hành trình, nước, chuỗi giống/phiếu nhập/NCC.
Nhánh `feature/OMTS-227-kiotviet-style-reports`. Chỉ đọc, không sửa mã, không commit.
Cách kiểm: đọc mã web + backend và gọi API thật (`127.0.0.1:8080`, web `localhost:3002`, owner). Mỗi mục ghi **[CHẠY THẬT]** hoặc **[ĐỌC CODE]**.
Dữ liệu mẫu dùng: hóa đơn HD000001, QR `aMWPz26QIo9BxPNMHBy8cA`, lô `DEMO-01-B1-01-20261118` (Published, 392 kg cân, ước tính 400).

---

## 1) Tóm tắt đánh giá

Mức trưởng thành: **6,5/10**.

Điểm mạnh
- Trang công khai mới `/api/public/provenance/{token}` là whitelist đúng BR-ORIGIN-04. Test thật không thấy khách, giá, kg, NCC, lý do thu hồi. [CHẠY THẬT]
- Token 128 bit, so sánh phân biệt hoa thường (chữ thường trả 404), 404 giống nhau cho token sai và token lạ, `no-store`, rate limit 60/phút/IP (429 xác nhận khi bắn 150 lượt). [CHẠY THẬT]
- Có đủ vòng đời: công bố / thu hồi (chỉ Owner) / công bố lại, báo thương lái, audit, sửa dữ liệu truy xuất có dấu "đã sửa", xuất Excel, trả hàng bỏ đi thì ẩn lô khỏi trang công khai, hóa đơn hủy chỉ hiện khối HTX.
- Web: SSR, noindex, `referrer: no-referrer`, ảnh qua proxy kiểm chữ ký (chữ ký sai trả 400), VI/EN, có skip-link và ngữ nghĩa tốt.

Điểm yếu chính
1. Endpoint cũ `/api/origin/{token}` vẫn sống, không rate limit, lộ tên NCC, mã lô NCC, kg bán, kg thu hoạch, số lượt nước. [CHẠY THẬT]
2. Chuỗi truy xuất thiếu mắt xích **ươm** (nursery), **nước**, **cân cảng (kg thực)**, **kế hoạch thu hoạch**, **claim**, **chứng nhận theo vùng/lô**.
3. Trang công khai ít "bằng chứng": bỏ logo, ảnh bìa, file chứng nhận; không có nước, không có chuỗi ươm; tiêu đề tab sai thương hiệu.
4. QR chỉ là đường link trong tin nhắn. Không có ảnh QR, nhãn in, PDF hóa đơn. Không cấp lại QR.
5. Rate limit của trang công khai có khả năng dùng chung một bucket cho mọi khách (web không chuyển IP khách).

---

## 2) LỖI LOGIC

### L1 - Cao - Endpoint cũ `/api/origin/{token}` lộ dữ liệu cấm và không giới hạn lượt
- File: `OMTS.Api/Controllers/Traceability/PublicOriginController.cs:12-20` (không có `[EnableRateLimiting]`); `OMTS.Infrastructure/Persistence/Queries/PublicOriginQuery.cs:19,46-53,61`; `OMTS.Application/Features/Traceability/Origin/PublicOriginService.cs:46,64`.
- Kịch bản: `GET /api/origin/aMWPz26QIo9BxPNMHBy8cA` không đăng nhập. Trả `supplierName: "Trại giống hàu Cái Rồng"`, `supplierLotCode: "LOT-HG-0801"`, `soldKg: 120`, `harvestedKg: 400`, `harvestedCages`, `water.averagePh`. Bắn 75 lượt liên tiếp đều 200, không có 429. [CHẠY THẬT]
- Trái BR-ORIGIN-04 (đã ghi trong `SRS_UPDATE_HANDOFF_FOR_PM_2026-11-18.md`). Web hiện không gọi endpoint này, nên gỡ được ngay (trừ khi Mobile còn dùng, cần xác nhận).
- Lỗi phụ của endpoint cũ: không loại lô bị trả bỏ đi (CLAIM-03), không lọc theo hóa đơn đã sửa, trung bình nước tính cả vùng chứ không riêng bè.

### L2 - Trung - Số ngày nuôi và danh sách thả giống lẫn các đợt thả khác của cùng làn
- File: `ProvenancePageQuery.cs:68-80` (join `LaneId` + `CycleId`, không lọc `SeedingDate <= HarvestDate`, không cắt theo lần thu hoạch trước của làn); `ProvenancePageBuilder.cs:53-57`; tương tự `LotTraceQuery`/`seedings.ListByCycleAsync` ở trace nội bộ.
- Kịch bản: làn 1 thả 11/10, thu xong 01/11 (lô A), thả lại 05/11, thu 18/11 (lô B). Trang công khai của lô B liệt kê cả 11/10 và `daysOfFarming = 38` thay vì 13. Nếu có thả giống sau ngày thu hoạch cùng chu kỳ, trang hiện ngày thả sau thu hoạch và số ngày nuôi **âm**.
- Xác nhận: [ĐỌC CODE] (không tạo dữ liệu để tránh ghi vào DB). Demo hiện chỉ có 2 phiên đúng thời điểm nên không lộ lỗi.
- Hệ quả: dữ liệu nguồn gốc công khai sai, mà BR-CYCLE-02 cho phép làn thả lại.

### L3 - Trung - Truy xuất nội bộ hiển thị kg ước tính, bỏ kg cân cảng
- File: `LotTraceDtos.cs:59-91` (chỉ `CageCount`, `EstimatedKg`, không có `WeighedKg`, `WeighedAt`); `LotTraceBuilder.cs:55-87`; web `trace-lot-header.tsx:27-28` ("kg ước tính").
- Kịch bản: lô DEMO-01-B1-01-20261118 trace trả `estimatedKg = 400` còn chi tiết lô `weighedKg = 392`. [CHẠY THẬT]
- Trái quyết định "cân cảng là nơi duy nhất nhập kg". Tổng `invoicedKg` cũng không trừ phần trả lại.

### L4 - Trung - Thiếu mắt xích ươm dù dữ liệu có sẵn
- `SeedingRecord.NurseryBatchId` (`Domain/Entities/Cultivation/SeedingRecord.cs:36`) và chi tiết lô đã trả `references.nurseryBatch` (`/api/harvest-lots/{id}`), nhưng `LotTraceBuilder.Seeding` (`:93-99`) và trang công khai không dùng.
- Hệ quả: chuỗi "giống → ươm → bè" đứt ở ươm. `daysOfFarming` tính từ ngày thả, bỏ số ngày ươm nên thấp hơn tuổi thật. [CHẠY THẬT: JSON trace không có từ "nursery"]

### L5 - Thấp - Tìm theo hóa đơn vẫn trả lô của hóa đơn đã hủy
- `LotTraceQuery.cs:25` không lọc `StatusId != Cancelled`. Tìm `HD...` đã hủy ra lô nhưng khối "Truy xuất xuôi" rỗng (vì `SaleLinesAsync` loại hóa đơn hủy, `:44`). [ĐỌC CODE]

### L6 - Thấp - Số lượng phiên thả nhiều làn lặp lại ở mỗi làn
- Trace phiên `91e037b0...` (3.000 con) hiện dưới cả làn 1 và làn 2 với cùng số lượng (`trace-backward-panel.tsx:33`). Dễ bị cộng đôi khi đọc. [CHẠY THẬT]

### L7 - Thấp - Tìm lô chỉ theo tiền tố mã
- `LotTraceQuery.cs:20` `StartsWith`. Không tìm theo bè, ngày, sản phẩm, khách, mã lô giống/NCC. Không có truy xuất ngược từ lô giống/NCC ra các hóa đơn và khách (cần khi thu hồi giống lỗi). [ĐỌC CODE]

### L8 - Thấp - Khách và SĐT thương lái không bị chặn theo vùng hóa đơn
- `LotTraceBuilder.cs:107-121` chỉ chặn giá/thành tiền theo quyền xem hóa đơn của vùng hóa đơn; `CustomerName`, `CustomerPhone` luôn hiện cho ai có quyền truy xuất vùng lô (BR-SALE-08 nói vùng hóa đơn không phải lúc nào cũng là vùng lô). [ĐỌC CODE]

---

## 3) RỦI RO RIÊNG TƯ / BẢO MẬT trên trang công khai

| # | Mức | Vấn đề | Bằng chứng |
|---|-----|--------|-----------|
| P1 | Cao | `/api/origin/{token}` lộ NCC, mã lô NCC, kg bán/thu hoạch, không rate limit (xem L1) | [CHẠY THẬT] |
| P2 | Trung | Web không chuyển IP khách: `origin-page-fetch.ts:62-65` dùng `fetch` trần, chỉ `Accept`. Backend (`RateLimitingExtensions.cs:84-89`) chia bucket theo `RemoteIpAddress`. Sau khi triển khai sau Next server, mọi khách chung một bucket 60/phút: một người dò token hợp lệ về hình dạng làm 429 cho mọi người quét QR thật. Header `X-Client-Ip` + `X-Bff-Secret` đã có ở `backend-transport.ts` nhưng trang công khai không dùng | [ĐỌC CODE]; trạng thái 429 hiển thị đúng ở web [CHẠY THẬT] |
| P3 | Trung | Tọa độ bè 5 chữ số thập phân (~1 m) công khai. Cho phép biết vị trí tài sản và lịch trình. Cân nhắc làm tròn hoặc chỉ hiện vùng | `ProvenancePageBuilder.cs:60-63`; JSON thật `21.071200,107.432100` |
| P4 | Trung | Ảnh bè và ảnh thu hoạch công khai bằng URL ký 1 giờ (`ProvenancePageService.cs:58`), trong khi DTO ghi "10 phút" (`ProvenancePageDtos.cs:89`). Lệch tài liệu. Ảnh nhật ký chăm sóc đúng là không có trong trang (khớp BR-FARM-09) | [CHẠY THẬT] |
| P5 | Thấp | Mã hóa đơn tuần tự (HD000001) và ngày hóa đơn hiện công khai: lộ quy mô giao dịch | JSON thật |
| P6 | Thấp | Không có nhật ký lượt xem công khai (số lần quét, thời điểm, lang). Không phát hiện được dò token hay QR bị lan truyền | `Features/Traceability/Origin` không có audit |
| P7 | Thấp | `next.config.ts` không đặt header bảo mật (CSP, X-Frame-Options, HSTS, Referrer-Policy) cho trang công khai. Chỉ proxy ảnh có CSP sandbox. Header phản hồi trang `/origin/...` không có | [CHẠY THẬT] |
| P8 | Thấp | Không có thu hồi/đổi token: QR lộ thì chỉ có cách hủy hóa đơn | `SalesInvoiceSendingService.cs:82` |

Đã đạt: token không bị ghi vào audit (`:92`), 404 không phân biệt token lạ/sai dạng, không CORS mở, noindex.

---

## 4) THIẾU SÓT so với SRS và so với hệ thống truy xuất chuyên nghiệp

Chuỗi mắt xích (có / thiếu)
- Có: lô → bè/vùng → chu kỳ → làn → phiên thả giống → lô giống (PN...) → phiếu nhập → NCC → hóa đơn → thương lái, trả hàng.
- Thiếu (nội bộ và công khai):
  - **Ươm** (batch NU..., ngày ươm, hao hụt, người làm): có dữ liệu nhưng không vào trace.
  - **Cân cảng**: kg thực, thời điểm, người cân.
  - **Kế hoạch thu hoạch / đơn đặt hàng** nguồn của lô (bắt buộc nhưng 5/5 lô demo có `harvestPlan = null`, nên trace và demo không đại diện cho quy tắc "chỉ thu hoạch theo kế hoạch").
  - **Chất lượng nước**: có `WaterMeasurement` nhưng trace nội bộ và trang công khai mới không dùng (chỉ endpoint cũ có trung bình). Trang công khai còn nói "nước biển được đo mỗi tháng" ở phần giới thiệu mà không có số liệu.
  - **Vật tư/thuốc/thức ăn đã dùng** (`MaterialUsage`, `InputIssue`) trong chu kỳ của lô.
  - **Nhân công** thu hoạch (`Crew`), người ghi nhận.
  - **Kiểm dịch/giấy chứng nhận con giống** (mã lô NCC `SupplierLotCode` không có trong trace; có ở endpoint cũ).
  - **Claim chất lượng**: `QualityClaim` chỉ gắn hóa đơn (`Sales/QualityClaim.cs:20`), trace không hiện claim; claim được chấp nhận không gợi ý thu hồi/tạm khóa lô; không "tạm ngưng" (quarantine) khác với thu hồi.
  - **Chứng nhận**: `CooperativeCertification` không có phạm vi vùng/sản phẩm/ngày cấp. Mọi lô, mọi vùng đều hiện cùng danh sách chứng nhận (VietGAP của vùng 1 hiện trên lô vùng 2). Trạng thái tính theo "hôm nay", không theo ngày thu hoạch (`CooperativeProfileViews.cs:65-81`): hóa đơn cũ mất chứng nhận khi hết hạn. **Giấy tờ pháp lý vùng** (`ZoneComplianceDocument`) không vào trace, không chặn công bố khi hết hạn.
  - **Vận chuyển/bàn giao**: không có.
- Chỉ báo đầy đủ dữ liệu: chỉ có danh sách thiếu ở trace (ghi chú làn thiếu giống). Không có điểm đầy đủ %, không có checklist trước khi chốt QR, không thống kê lô thiếu dữ liệu toàn HTX.
- QR: không có ảnh QR để in/dán, không nhãn in/PDF cho hóa đơn hoặc lô (web không có chức năng in hóa đơn; lib QR chỉ dùng cho VietQR). Không phiên bản định dạng QR, không mã ngắn. Không cấp lại QR (BR-TRACE-02 "không bao giờ làm lại", `SalesInvoiceSendingService.cs:76-84`): nếu chọn "Có QR" lúc dữ liệu còn thiếu thì hóa đơn đó không bao giờ có QR (HD000002 là ví dụ: chưa quyết định QR).
- Xác nhận phía công khai: không có "dấu xác thực" (chữ ký HTX, mã kiểm tra), không nút báo lỗi/ liên hệ khiếu nại có gắn mã lô.
- Verification (`features/verification*`): là xác minh OTP số điện thoại/email, **không thuộc** chuỗi truy xuất. Không có luồng xác minh bên thứ ba nào cho dữ liệu nguồn gốc.
- Bản tiếng Anh: phụ thuộc Q15 chờ PM.

---

## 5) CẢI THIỆN UI/UX

Trang công khai
- Tiêu đề tab và mô tả **sai thương hiệu**: `page.tsx:28` và `origin-copy.ts:60` cứng "HTX Trung Nam"; header trang cứng logo/tên "HTX Trung Nam" (`/brand/trung-nam-oyster.webp`), trong khi HTX trong dữ liệu là "Hợp tác xã Nuôi hàu Vân Đồn". [CHẠY THẬT]
- `origin-page-fetch.ts:22` xóa `logoUrl`, `coverPhotoUrl` và `fileUrl` của chứng nhận. Hậu quả: không logo/ảnh bìa HTX, và khách không mở được file chứng nhận (chỉ thấy tên). Nên thêm proxy cho logo/cover/file hoặc cho phép đường dẫn công khai đã ký.
- Trạng thái lỗi trả **HTTP 200** cho token sai, không tìm thấy, bị giới hạn lượt (`page.tsx` không gọi `notFound()` và không đặt status). Nên 404/429/503 để giám sát và để Zalo/SMS không xem trước như trang hợp lệ. [CHẠY THẬT: `/origin/AAAAAAAAAAAAAAAAAAAAAA` trả 200]
- Tiêu đề h1 là "Hóa đơn HD000001", sản phẩm chỉ ở dòng phụ. Nên đưa tên sản phẩm + tên HTX + dấu "đã xác thực" lên đầu, hóa đơn xuống phụ.
- Huy hiệu "Đang hiệu lực" (`origin-lot-card.tsx:38`) luôn xanh với lô Published, không phản ánh claim/hết hạn chứng nhận. Chưa có dấu "Dữ liệu đã được sửa ngày..." dù có TRACE-03.
- Hành trình (timeline) chỉ 3 loại bước: thả giống, thu hoạch, bán. Thêm ươm, các mốc chăm sóc (số lần), cân, kiểm nước (tóm tắt), chứng nhận hiệu lực.
- Bản đồ chỉ là link Google Maps; nên có bản đồ tĩnh hoặc nhúng, chọn mức chính xác (vùng).
- Nhãn "Bán theo hóa đơn" trong timeline lặp ngày hóa đơn (trùng h1).
- Open Graph/Twitter card: chưa có `openGraph`; link dán vào Zalo/Messenger không có ảnh và tên đúng (nên có ảnh bìa HTX, `noindex` giữ nguyên).
- Mobile 360 px: chưa chụp kiểm lại trong lần này. Lưới ảnh `width=400 height=300` cố định; cần kiểm tràn ngang.
- Tiếng Việt: dùng "thu hồi" cho cả rút nguồn gốc lẫn thu hồi sản phẩm. Cân nhắc "rút thông tin nguồn gốc" để khỏi gây hiểu nhầm là thu hồi hàng.

Màn truy xuất nội bộ
- Bảng trace cho mỗi làn một hàng nhưng không có nhóm theo phiên và không có dòng thời gian toàn chuỗi. Nên có sơ đồ "Lô giống → Ươm → Bè → Thu hoạch → Cân → Hóa đơn" kèm chỉ báo xanh/đỏ từng mắt xích.
- Trang chi tiết hóa đơn (`invoice-info-tab.tsx:35`) chỉ có link chữ "Trang nguồn gốc (mã QR)". Thiếu: ảnh QR, nút sao chép link, in, và liên kết cột "Lô thu hoạch" sang màn truy xuất.
- `invoice-finish-panel.tsx:54-62`: bấm "Có, kèm mã QR" nhưng nếu không lô nào công bố được thì không có QR và giao diện **không báo** (chỉ không thấy link). Cần thông báo rõ "Chưa tạo được QR vì...", dùng `sent.lots`.
- Tìm kiếm chỉ 2 chế độ; thiếu bộ lọc ngày/bè/sản phẩm/lô giống; thiếu cảnh báo nhanh "lô đã bán chưa công bố".
- Thiếu nhắc lỗi "claim đang mở" ngay trên đầu trace.

---

## 6) Đề xuất ưu tiên (top 8)

| # | Việc | Công | Đổi dữ liệu công khai / nghiệp vụ cần PM duyệt? |
|---|------|------|---|
| 1 | Gỡ hoặc khóa `/api/origin/{token}` (xác nhận Mobile không dùng); nếu giữ thì áp whitelist = trang mới + rate limit | S | Gỡ thì không đổi nghiệp vụ; giữ thì **cần PM** (BR-ORIGIN-04 Q) |
| 2 | Web chuyển `X-Client-Ip`, `X-Bff-Secret`, UA cho gọi `/api/public/provenance` (tái dùng `backend-transport`) để rate limit theo từng khách; thêm header bảo mật cho `/origin/*`; trả đúng mã HTTP 404/429/503 | S | Không |
| 3 | Lọc phiên thả giống theo ngày <= ngày thu hoạch và cắt theo lần thu hoạch trước của làn (trace nội bộ + trang công khai); thêm test thả lại làn | M | **Cần PM xác nhận** quy tắc "đợt thả của lô" (đổi số liệu công khai: ngày thả, số ngày nuôi) |
| 4 | Thêm kg cân cảng (`weighedKg`, `weighedAt`) và kế hoạch thu hoạch vào `LotTrace`; bỏ nhãn "kg ước tính" khi đã cân | S | Không (nội bộ) |
| 5 | Thêm mắt xích ươm vào trace nội bộ (batch, ngày, hao hụt); đưa ngày ươm vào trang công khai nếu PM đồng ý | M | Nội bộ: không. Công khai: **cần PM** (đổi dữ liệu QR công khai, AGENTS) |
| 6 | Sửa thương hiệu cứng "HTX Trung Nam" (tiêu đề, header, mô tả) lấy từ khối HTX API; cho phép logo/ảnh bìa/file chứng nhận qua proxy; thêm OG | S-M | Hiện file chứng nhận là **đổi dữ liệu công khai, cần PM** |
| 7 | QR đầy đủ trên web: ảnh QR + sao chép + in nhãn/PDF hóa đơn; báo rõ khi QR không tạo được; chức năng "cấp lại QR/ bổ sung công bố" cho hóa đơn đã quyết định | M-L | Cấp lại QR **cần PM** (BR-TRACE-02 hiện cấm) |
| 8 | Liên kết claim: hiển thị claim theo lô/hóa đơn trong trace, gợi ý tạm ngưng/thu hồi khi claim được chấp nhận; chứng nhận có phạm vi vùng + đánh giá theo ngày thu hoạch; nhật ký lượt xem công khai | L | **Cần PM** (thêm bước nghiệp vụ, đổi dữ liệu công khai, đổi trạng thái lô) |

Thứ tự nên làm: 1, 2, 4, 6 (nhanh, ít rủi ro) trước, rồi 3, 5, 7, 8 sau khi PM trả lời.

---

## 7) Câu hỏi mở

1. Mobile hoặc hệ khác còn gọi `/api/origin/{token}` không? Được gỡ hẳn không?
2. Quy tắc phiên thả giống thuộc về lô: chỉ các phiên <= ngày thu hoạch và sau lần thu hoạch trước của làn? Số ngày nuôi có cộng ngày ươm không?
3. Có hiển thị ươm, chất lượng nước (dạng tóm tắt), số lần chăm sóc trên trang công khai không? (BR-ORIGIN-04 nay liệt kê whitelist cố định.)
4. Có cho khách mở file chứng nhận từ trang công khai và hiển thị logo/ảnh bìa không? (Web đang chủ động bỏ.)
5. Chứng nhận có gắn với vùng/sản phẩm và tính hiệu lực theo ngày thu hoạch không?
6. Có cho cấp lại QR hoặc công bố bổ sung sau khi hóa đơn đã quyết định không? (BR-TRACE-02 hiện cấm.)
7. Claim được chấp nhận có tự động đề xuất thu hồi/tạm ngưng lô không? Thêm trạng thái "tạm ngưng" không?
8. Có cần mức chính xác tọa độ công khai (làm tròn hay chỉ vùng)?
9. Cần ghi nhật ký lượt xem công khai (số quét, thời gian) không? Chính sách lưu bao lâu?
10. Dữ liệu demo cho `harvestPlan = null` ở 5/5 lô: có cần chạy lại seed theo đúng quy tắc "chỉ thu hoạch theo kế hoạch" để demo đúng?
11. Rate limit live: lần đo đầu 75 lượt không có 429 rồi lần sau 142/150 là 429; khả năng cửa sổ cố định quay giữa chừng. Cần kiểm lại trên môi trường staging có proxy thật (IP khách đúng).
