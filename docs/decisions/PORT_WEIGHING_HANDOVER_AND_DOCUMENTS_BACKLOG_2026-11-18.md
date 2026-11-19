# Việc làm sau: cân tại cảng, chênh lệch, bàn giao và giấy tờ (18/11/2026)

**Người yêu cầu:** chủ dự án (Duy Thái). **Trạng thái:** CHƯA LÀM, chỉ ghi lại để làm sau buổi kiểm tra 13/11 và sau khi chốt với PM. Không có code nào cho phần này trong đợt sửa ngày 18/11.

## 1. Yêu cầu của chủ dự án (nguyên ý)

Sau thu hoạch, tại cảng cần:
1. **Cân tại cảng** và xem **chênh lệch số lượng** (số lượng ước tính khi thu hoạch so với số lượng cân thật).
2. So với **số lượng khách muốn mua** (đơn đặt hàng DH).
3. **Xác nhận bàn giao** cho khách.
4. **Lập các loại giấy tờ** đi kèm: hóa đơn VAT, phiếu xuất kho, biên bản giao nhận hàng hóa. Chủ dự án chưa chắc đây là các loại giấy tờ đúng.

## 2. Hệ thống hiện có (đã kiểm tra trong md backend 18/11)

- Cân tại cảng là **cân lô thu hoạch**: `POST /api/harvest-lots/{id}/weigh`; lô có trạng thái **Chờ cân (2904)** rồi **đã cân**. Phiếu cân cảng riêng (`/api/port-weighings`, `/api/me/port-weighings`) **đã bị gỡ ngày 17/11** (backend #106), nên không làm lại phiếu cân. Nguồn: `omts-backend/docs/api-behaviour-reference.md` (dòng 355) và `docs/cage-order-harvest.md`.
- Thương lái **xác nhận trực tiếp** (không có bước xác nhận trong hệ thống). Hóa đơn bán lập **từ đơn DH**, mỗi dòng nêu `harvestLotId` và `kg` đã cân.
- Đã có chỉ số chênh lệch ở thu hoạch: `HarvestLotFigures` có `InvoicedKg`, `ReturnedKg`, `SoldKg`, `RemainingKg`, `LostKg`, `DifferenceKg` (`Features/Harvest/HarvestLotFigures.cs`) và báo cáo `harvest-yield`.
- Đã có đơn DH với `progress` theo đơn vị (số lượng đặt so với đã giao) và `GET /api/sales-orders/{id}/invoice-draft`.
- Web: đã có màn lô thu hoạch có cân và vòng đời (commit `da178d4`), đơn đặt hàng, hóa đơn. Chưa có màn "bàn giao tại cảng" gom cân + so với đơn + xác nhận + in giấy tờ.

## 3. Việc cần làm (đề xuất, chưa được duyệt)

| # | Việc | Ghi chú |
|---|---|---|
| 1 | Màn **Cân và bàn giao tại cảng**: chọn lô chờ cân, nhập kg cân, hiện **chênh lệch** so với ước tính (kg và %) và **so với số lượng khách đặt** (còn thiếu / thừa) | Dùng `weigh` và `progress` của đơn DH có sẵn; có thể chỉ cần thêm một màn đọc |
| 2 | **Xác nhận bàn giao**: ghi người giao, người nhận (thương lái hoặc người đại diện), thời điểm, số lượng thực giao | Hiện chưa có thực thể; cần quyết định có lưu trong hệ thống không (mục 5, câu 1) |
| 3 | **In hoặc xuất giấy tờ** (PDF hoặc .xlsx) từ dữ liệu đã có: xem mục 4 | |
| 4 | Cảnh báo khi số cân lệch lớn so với ước tính hoặc so với đơn (ngưỡng do PM chốt) | Có thể nối thông báo hiện có |
| 5 | Cập nhật SRS: use case cân và bàn giao, thực thể bàn giao, mã message mới | Ghi vào `SRS_UPDATE_HANDOFF_FOR_PM_2026-11-18.md` khi PM duyệt |

## 4. Các loại giấy tờ: trả lời câu "đúng không"

**Chưa xác nhận bởi kế toán hoặc cơ quan thuế. Các nhận định dưới đây là hiểu biết chung, cần Kế toán của HTX và PM kiểm tra trước khi làm.**

| Giấy tờ | Đúng loại không | Điều cần lưu ý |
|---|---|---|
| **Hóa đơn** (hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP) | Đúng là chứng từ bán hàng bắt buộc. Chữ "VAT" tức là **hóa đơn GTGT** | HTX bán **thủy sản nuôi trồng chưa qua chế biến** ở khâu tự sản xuất thường thuộc diện **không chịu thuế GTGT** (Luật Thuế GTGT điều 5). Nếu đúng thì hóa đơn không có thuế suất 8% hoặc 10% mà ghi "không chịu thuế" (hoặc dùng loại hóa đơn bán hàng). Cần kế toán xác nhận trường hợp của HTX |
| **Phiếu xuất kho** | Đúng với kế toán kho (mẫu 02-VT) | Là chứng từ **nội bộ**, không phát cho khách. Nếu hàng chở đi bán thì có thể dùng **phiếu xuất kho kiêm vận chuyển nội bộ**, nhưng khi đã lập hóa đơn thì thường không cần |
| **Biên bản giao nhận hàng hóa** | Đúng, là giấy tờ thông dụng, không có mẫu bắt buộc của nhà nước | Cần có: hai bên, thời gian, địa điểm, loại hàng, số lượng đã cân, chênh lệch nếu có, chữ ký |
| (Có thể cần thêm) **Biên bản xác nhận chênh lệch số lượng** | Hợp lý khi số cân khác số khách đặt | Có thể gộp vào biên bản giao nhận |

Hiện hệ thống **đã in được hóa đơn** (đã có `GET /api/sales-orders/{id}/print` và xuất danh sách hóa đơn). Phần còn thiếu thật sự là biên bản giao nhận và phiếu xuất kho (nếu Kế toán cần).

## 4b. Quyết định của chủ dự án (18/11/2026, sau khi lập mục 1-5)

- **Cảnh báo chênh lệch chỉ là cảnh báo, không cấm.** Khi số cân vượt hoặc thiếu quá ngưỡng so với ước tính hoặc so với đơn, hệ thống chỉ báo cho người dùng, vẫn cho lưu và bàn giao. Ngưỡng cụ thể vẫn do PM hoặc chủ HTX chốt (câu 5).
- **Người xác nhận bàn giao:** có thể là Quản lý vùng hoặc chính Chủ HTX. Chủ dự án **chưa biết** nên tạm chưa chốt (câu 2); khi làm, cho phép cả hai và ghi người thực hiện.
- **Biên bản giao nhận khác hóa đơn bán hàng.** Hóa đơn là chứng từ thuế và kế toán; biên bản xác nhận việc giao (ai giao, ai nhận, số cân thật, chênh lệch). Hóa đơn không thay được biên bản. Đề xuất bản đầu: chỉ **in biên bản** từ dữ liệu có sẵn.

## 5. Câu hỏi cần chốt trước khi làm

1. Bàn giao có **lưu trong hệ thống** (thực thể mới, có thể tra cứu) hay chỉ **in biên bản** từ dữ liệu đã có? Đề xuất: bắt đầu bằng in, lưu sau nếu cần.
2. Ai xác nhận bàn giao: Quản lý vùng tại cảng, Chủ HTX, hay cả hai? **(Chưa chốt: có thể là Quản lý hoặc chính Chủ HTX.)** Thương lái có xác nhận trên Mini App không (hiện xác nhận "trực tiếp", ngoài hệ thống)?
3. HTX có **xuất hóa đơn có thuế GTGT** hay hóa đơn không chịu thuế? Có dùng phần mềm hóa đơn điện tử bên ngoài (VNPT, Viettel, MISA...) cần tích hợp không?
4. Có cần **phiếu xuất kho** không, khi kho thành phẩm (hàu sau thu hoạch) hiện được quản lý bằng sổ kho sản phẩm?
5. Ngưỡng cảnh báo chênh lệch (ví dụ vượt 5% hoặc 10%). Đã chốt: chỉ cảnh báo, **không chặn** (mục 4b); còn thiếu con số ngưỡng.

## 6. Liên quan

- Phiếu cân cảng đã gỡ: `omts-backend/docs/api-behaviour-reference.md` dòng 355.
- Quy trình sau thu hoạch: `omts-backend/docs/cage-order-harvest.md`.
- Bàn giao PM (các chỗ SRS lệch): `docs/reports/SRS_UPDATE_HANDOFF_FOR_PM_2026-11-18.md`, phần 3 mục bán hàng và thu hoạch.
