# Kế hoạch thực hiện hàng loạt: ươm giống, ảnh từng bước, % tiến độ làn

Căn cứ: `FARMING_NURSERY_STEP_SPEC_2026-11-12.md` (mục 2 đến 7, 10.1 đến 10.6). Chủ dự án đã chốt nội dung. Điều kiện chạy: **PM xác nhận phần SRS** (mục 4 của đặc tả) nhưng có thể làm song song vì thay đổi chỉ nằm trên nhánh riêng, chưa vào `develop`.

## Nguyên tắc làm việc (tiết kiệm hạn mức)

- Mỗi đợt nhỏ, một agent, **không chạy đợt test dài**: backend chỉ chạy lớp test vừa thêm trong **một container 3 GB**, không SQL Server nếu không cần; web chỉ chạy lint, kiểm tra kiểu một lần và test hàm thuần mới.
- Không chạm tới đơn khách, bán hàng, kế hoạch làm việc của đồng đội (OMTS-223). Thu hoạch gắn yêu cầu mua theo `develop` giữ nguyên.
- Nhánh backend mới `feature/OMTS-132-nursery` tạo từ `feature/OMTS-132-raft-lanes`. Nhánh web hiện tại tiếp tục.
- Mỗi đợt kết thúc bằng một commit; sau đợt backend dựng lại backend demo (cổng 8082) để chủ xem thử trên web.
- Không push, không đụng `develop` hay `main`.

## Đợt B1: Backend ươm (làm trước)

**Việc:** NurseryBatches, NurseryBatchAllocations, NurseryBatchPhotos, mở rộng CultivationCycles và SeedingRecords, mục đích Xuất dùng `Nursery`, endpoint mục 5.2 của đặc tả (tạo, sửa, hủy, hoàn tất tạo chu kỳ cho từng bè, sửa số sống sót, chuyển phân bổ, lịch sử, available), một lô giống mỗi đợt, bỏ ngày thu dự kiến khỏi form và đọc, thông báo cho chủ khi Quản lý vùng ghi, tóm tắt và sản lượng thêm khối ươm.
**Ảnh:** multipart `photos` 1 đến 3 cho bắt đầu ươm, hoàn tất ươm (và tạo chu kỳ), thả giống mới, thu hoạch mới, sự cố làn (bắt buộc 1 đến 3); kiểm tra bản ghi cũ vẫn hợp lệ.
**Kết quả:** hợp đồng API `FARMING_NURSERY_API_CONTRACT_2026-11-12.md`, migration mới, test mới theo lớp.
**Kiểm tra gọn:** unit cho công thức hoàn tất (tổng phân bổ = sống sót), integration trong bộ nhớ cho endpoint chính, một test SQL Server up/down/up chỉ khi cần.

## Đợt B2: Backend % tiến độ làn (sau B1 hoặc song song nếu không đụng cùng file)

**Việc:** cột `SeededPercent`, `HarvestedPercent` trên làn của bản ghi thả giống và thu hoạch (mặc định 100 khi thả cả làn, thu cả làn); `PUT /api/rafts/{raftId}/lanes/{n}/progress`; cộng dồn không vượt 100%; "Hoàn tất thu hoạch" đặt 100%; trạng thái làn suy ra; đọc trả % mỗi làn; lịch sử cũ → mới; migration backfill: làn đã thả = 100, làn đã thu = 100, làn đang thu một phần để null (hiển thị "đang thu").
**Kết quả:** mục bổ sung của hợp đồng API, test lớp mới.

## Đợt W1: Web giao diện làn cột ngang (Codex hoặc agent web)

**Việc:** thành phần dùng chung thay lưới làn hiện tại: các cột đứng xếp ngang, kéo ngang, đổ màu theo %, màu **đậm và nổi bật** theo token (chưa thả xám nhạt có viền, đã nuôi xanh lá đậm, đã thu xanh dương đậm, đang thu cam, hỏng đỏ, ngừng gạch chéo), nhãn % trên mỗi cột, chú giải, tìm làn, chế độ chọn nhiều làn và hoàn tất nhiều làn giữ nguyên. Bấm một làn mở popover chi tiết: % thả, % thu, người sửa, lịch sử, ô nhập số % (không kéo). Dùng ở chi tiết bè, tiến độ chu kỳ, thả giống, thu hoạch.
**Phụ thuộc:** B2 cho dữ liệu %; trước đó chạy được với % suy ra từ trạng thái làn.

## Đợt W2: Web màn Ươm giống và hoàn tất ươm

**Việc:** màn Ươm giống (danh sách, lọc, chi tiết mở tại chỗ, lịch sử), bắt đầu ươm (hai bước: nhập gọn rồi bảng xem lại), hoàn tất ươm (số sống sót, chọn một hoặc nhiều bè cùng vùng, chia số mảnh, sản lượng dự kiến từng bè, bảng xem lại), sửa số sống sót (cũ → mới), chuyển phân bổ, ảnh 1 đến 3 ở mọi bước, thông báo, menu thứ tự mới, hành trình thêm bước Ươm.
**Phụ thuộc:** B1.

## Đợt W3: Web thả giống, thu hoạch, sự cố, ảnh, tổng kết

**Việc:** form thả giống lấy nguồn từ phân bổ ươm (còn X trên Y mảnh), nhập % làn trong form, ảnh 1 đến 3 bắt buộc; thu hoạch ảnh bắt buộc và nhập % làn; sự cố làn bắt buộc 1 đến 3 ảnh; chăm sóc ảnh và ghi chú tùy chọn; bỏ ô ngày thu dự kiến; tổng kết chu kỳ và Sản lượng nuôi thêm khối ươm; một thành phần tải ảnh dùng chung (xem trước, xóa, đếm 1/3, **nén ảnh phía trình duyệt** trước khi gửi để tiết kiệm dung lượng).
**Phụ thuộc:** B1, B2.

## Đợt D: Tài liệu và SRS

**Việc:** cập nhật `docs/SRS_DEVIATIONS.md` (bước ươm, ghi nhận sống sót, GBR-04, BR-CYCLE-07, ảnh bắt buộc, % làn), nhật ký chung mục G, `docs/USER_FLOWS.md` phần Nuôi trồng theo luồng mới, bản tóm tắt gửi PM.

## Thứ tự và song song

1. B1 và W1 song song (W1 chỉ dùng web, không đụng backend).
2. B2 sau B1 (cùng nhánh), W2 sau B1.
3. W3 sau B1, B2, W1.
4. D cuối (hoặc song song với W3).

## Điểm cần lưu ý (rủi ro)

| Rủi ro | Cách xử lý |
|---|---|
| Ảnh bắt buộc làm khó nhập liệu khi không có ảnh | Chỉ bắt buộc cho **bản ghi mới**; thông báo lỗi nêu rõ trường ảnh; bản ghi cũ không đổi |
| Dung lượng ảnh | Nén phía trình duyệt, giới hạn 10 MB, tối đa 3 ảnh mỗi bước |
| Lô thu hoạch gắn yêu cầu mua (develop) | Ảnh bắt buộc thêm vào form hiện có, không đổi luồng yêu cầu mua |
| Migration chồng với đồng đội | Tên migration mới sau `20261112120000_HarvestLotCrew`; kiểm tra lại với `develop` trước khi mở PR |
| Dữ liệu cũ không có ươm | Giữ nhánh cũ (kho trừ ở thả giống); báo cáo ghi "không có ươm" |
| Hạn mức | Giao từng đợt nhỏ; không chạy đợt test dài; báo cáo ngắn |

## Kiểm tra nghiệm thu (chủ thử trên web)

1. Bắt đầu ươm (chọn vùng, lô giống, số mảnh, ảnh) → bảng xem lại → tồn kho giảm.
2. Hoàn tất ươm (sống sót, chia cho một hoặc nhiều bè, ảnh) → chu kỳ nuôi xuất hiện cho từng bè.
3. Thả giống từ phân bổ: không vượt "Còn X trên Y mảnh", nhập % làn, ảnh bắt buộc.
4. Sơ đồ làn cột ngang: màu rõ, bấm làn xem và sửa %.
5. Thu hoạch: ảnh bắt buộc, % làn, hoàn tất nhiều làn.
6. Báo hỏng làn: bắt buộc ghi chú và ảnh.
7. Tổng kết chu kỳ có khối ươm (vào, sống sót ước tính, hao hụt ước tính).
