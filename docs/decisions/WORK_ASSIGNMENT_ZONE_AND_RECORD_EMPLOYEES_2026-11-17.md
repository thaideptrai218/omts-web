# Ghi chú cho PM: phân công theo vùng và nhân viên trên bản ghi (17/11/2026)

Người quyết định: user (Duy Thái). Trạng thái: **chờ PM cập nhật SRS** (chưa sửa SRS).

## SRS hiện tại (Report3_v8)
- LABOR-02 / BR-LABOR-03: một phân công = nhân viên + **bè** + loại việc + ngày. Bè bắt buộc.
- BR-LABOR-07: chi phí nhân công chia theo bè.
- HARVEST-01, CYCLE-02 (thả giống) và ươm: không có nhân viên tham gia. SRS v8 không có use case ươm.

## Thay đổi đề xuất
1. Phân công: bè **tùy chọn**, thêm **vùng**; ươm chỉ cần chọn vùng.
2. Thêm loại việc **Ươm**.
3. Ghi ươm, thả giống, thu hoạch có thể chọn nhân viên làm (tùy chọn); lưu xong tự tạo phân công. Chấm công vẫn thủ công.
4. Mỗi bản ghi lưu danh sách nhân viên bằng bảng riêng theo bản ghi.

## SRS cần sửa (đề nghị)
- LABOR-02, BR-LABOR-03 (bè tùy chọn, có vùng), BR-LABOR-07 (chi phí khi không có bè), LABOR-04 (điểm danh theo vùng).
- Entity WorkAssignment (thêm Zone, Raft nullable).
- Use case ươm và nhân viên trên bản ghi ươm, thả giống, thu hoạch (tổ thu hoạch hiện chỉ ở SRS_DEVIATIONS của backend).
- Danh mục loại việc: thêm Ươm.

Kế hoạch: `plans/261117-1534-OMTS-227-record-employees-and-zone-assignments/plan.md`.

## Kế hoạch thu hoạch theo đơn đặt hàng và thời gian trưởng thành (18/11/2026, chủ dự án chốt)
1. Kế hoạch thu hoạch **bắt buộc gắn ít nhất một đơn đặt hàng**; một kế hoạch được gộp nhiều đơn để thu nhanh hơn. Backend từ chối khi thiếu đơn (MSG-PLAN-07). Nút "Lập kế hoạch thu hoạch" ở chi tiết đơn mở form đã chọn sẵn đơn đó.
2. Cột "Lồng dự kiến" hiện thêm quy đổi kg/tấn (Lồng = 50 kg theo đơn vị tính của sản phẩm; nếu đơn có dòng Lồng thì dùng hệ số dòng đó). Khối "Đáp ứng đơn đặt hàng" hiện cùng một đơn vị ở cả hai cách nhìn, ví dụ "Cần 3 Tấn (≈ 60 lồng)", "Dự kiến 0 Tấn (≈ 0 lồng)" hoặc "72 Lồng (≈ 3,6 tấn)", để tổ thu hoạch theo dõi bằng lồng.
3. Chọn bè theo sản phẩm của đơn: bè đang nuôi sản phẩm của đơn xếp trước; bè khác vẫn hiện nhưng ghi rõ "không nuôi sản phẩm của đơn" (không ẩn).
4. Giống (nhóm Giống) có **thời gian trưởng thành** (số ngày từ thả giống đến thu hoạch được, tùy chọn). Ngày dự kiến thu hoạch của bè = ngày bắt đầu chu kỳ + số ngày đó, tính lúc đọc. Form kế hoạch hiện "Dự kiến thu hoạch từ dd/mm/yyyy · đã sẵn sàng" hoặc "chưa đủ ngày (còn N ngày)"; chọn ngày thu sớm hơn thì **cảnh báo, không chặn**. Chi tiết đơn hiện "Có sẵn" hoặc "Sắp có – dự kiến dd/mm" cho từng dòng hàng còn phải giao.
5. Giá trị demo (giả định, cần chủ hợp tác xã xác nhận): Thái Bình Dương 3 cm 240 ngày (hàu Thái Bình Dương ở Bái Tử Long khoảng 8 tháng), 5 cm 180 ngày (đầu dưới của 6–8 tháng), bản địa Vân Đồn 365 ngày (khoảng 1 năm theo Vietcetera), Cổ Trai 300 ngày (không có nguồn).

6. Bỏ "Luống dự tính": dòng kế hoạch chỉ gồm vùng, bè, lồng dự kiến; danh sách hiện Số bè, Lồng dự kiến, Đã thu (số bè đã có lô). Bỏ nút "Không thu" theo luống.
7. Một đơn chỉ có một kế hoạch đang mở (MSG-PLAN-08); kế hoạch bị hủy thì đơn lập lại được. Form kế hoạch liệt kê đơn đã có kế hoạch kèm mã (không chọn được); chi tiết đơn ẩn nút lập kế hoạch khi đã có.

SRS cần sửa (đề nghị): use case kế hoạch thu hoạch (đơn bắt buộc, nhiều đơn một kế hoạch), danh mục Giống (thêm thời gian trưởng thành), màn đơn đặt hàng (Có sẵn / Sắp có).

## Thu hoạch từ kế hoạch, cân tại cảng, hóa đơn chỉ lô đã cân (18/11/2026, chủ dự án chốt)

1. Thu hoạch chỉ được ghi từ một dòng của kế hoạch thu hoạch ("Thu hoạch theo kế hoạch KHTxxxxxx"); màn bè không còn nút "Ghi nhận thu hoạch". Backend từ chối lô không có kế hoạch (MSG-HARVEST-06); lô cũ vẫn đọc được. Dòng kế hoạch thu cả bè: không chọn làn, backend lấy mọi làn đang dùng, còn thả giống, không hỏng/ngừng.
2. Form thu hoạch (giữ giao diện form cũ) chỉ nhập "Số lồng thu được"; kg và tấn bên cạnh là quy đổi tạm tính, chỉ đọc (kg/lồng của đơn vị Lồng của sản phẩm, mặc định 50; tấn = kg/1000). Không nhập kg ở bước thu hoạch.
3. Cân tại cảng là nơi duy nhất nhập kg (hoặc tấn): thấy lô, bè, sản phẩm, số lồng mang lên và quy đổi để tham khảo, chênh lệch và % so với số mang lên, giờ cân mặc định bây giờ (giờ Việt Nam) sửa được.
4. Bảng "Lô thu hoạch" bỏ cột "Kg ước tính"; lô chưa cân hiện "Chờ cân", còn lại/đã bán không tính ước tính, hàng tổng không trộn ước tính.
5. Hóa đơn chỉ chọn lô đã cân (lô chờ cân bị từ chối, MSG-HARVEST-07); chọn lô thì số lượng tự điền bằng số kg còn lại của lô (quy ra đơn vị của dòng), được giảm.
