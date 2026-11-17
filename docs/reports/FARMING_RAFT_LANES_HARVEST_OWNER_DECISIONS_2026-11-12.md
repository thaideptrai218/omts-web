# Quyết định của chủ dự án về bè, làn và thu hoạch (12/11/2026)

File này **ghi đè** đặc tả `FARMING_RAFT_LANES_AND_HARVEST_PLAN_SPEC_2026-11-12.md` ở mọi chỗ mâu thuẫn. Đặc tả vẫn là nguồn chi tiết cho phần không bị ghi đè (mô hình bè, diện tích, API, giao diện).

## 1. Phạm vi: không làm phần đơn hàng, bán hàng

- Phần **đơn của khách và bán hàng do đồng đội làm** (OMTS-223: đơn mua theo lồng, kế hoạch làm việc theo đơn, nhân viên nhận ca, cân cảng). Ta **không** nối, không gắn, không sửa luồng đó.
- Không làm "đợt thu của đơn", không làm kế hoạch thu gắn với đơn, không dùng hằng số 20 lồng mỗi người mỗi ngày, không ánh xạ sản phẩm với giống.
- **Một đơn có nhiều lô thu hoạch:** bè A thu một lần là một lô, bè B thu một lần là một lô. Cộng lại là 2 lô, không bao giờ là một lô gộp lồng của hai bè.
- **Một lô là một bè, một lần thu là một bè.** Không gộp bè của nhiều vùng vào một lần thu. (Khớp SRS và đồng đội.)

## 2. Làn bị hỏng, đứt

Không có "thay dây/thay làn" và không có "gỡ làn". Chỉ có:

1. **Báo hỏng** một làn: chặn thả giống và thu hoạch ở làn đó, giữ lịch sử, ghi lý do, ảnh sự cố **tùy chọn**.
2. **Sửa làn:** trước tiên kiểm tra **vật tư trong kho** (dây, phao, vật tư sửa chữa) có đủ không. Có thì ghi sửa, **trừ kho theo đúng sổ kho** (phiếu xuất dùng liên kết với bè và làn, có nhật ký). Sửa xong làn trở lại trạng thái trước khi hỏng.
3. **Ngừng hoạt động** làn: khi hỏng quá không sửa được. Làn bị loại khỏi mọi danh sách gợi ý, giữ nguyên lịch sử. Nếu làn đang có giống thì ghi một **sự kiện mất giống không số lượng** (lý do bắt buộc) và làn **được coi là đã kết thúc khi đóng chu kỳ**.
- Không đánh số lại làn, số làn cố định cho truy xuất (D3). Không có trạng thái "Đang sửa" riêng (D4), chỉ cờ hỏng cộng ghi chú.
- **Một đợt phải xong hết mới bắt đầu vụ mới** (SRS đã có): ví dụ bè 40 làn, thu hết 20 làn, 20 làn kia không nuôi tiếp, thì 20 làn đã thu **chưa được thả giống lại** cho đến khi cả đợt kết thúc. Không thêm luật mới, chỉ giữ đúng luật SRS.
- **Thêm làn khi đang nuôi:** không hợp lý, bè được xây lúc chưa bắt đầu chu kỳ. Giữ BR-FARM-04: thêm hoặc bớt làn chỉ ở cuối và chỉ khi **chưa có chu kỳ mở** (không nới như D1 trong đặc tả). Làn hỏng giữa bè xử lý bằng 3 thao tác ở trên.
- Bè hoặc làn đã ngừng hoạt động chỉ được bỏ qua khỏi danh sách chọn, không xóa dữ liệu.

## 3. Tạo bè (giữ như đặc tả)

Mã, số làn, độ dài dây (m), chiều rộng bè (m), **diện tích tự tính** (m²), có thể đặt độ dài từng dây, sơ đồ làn đánh số, mọi trường ghi đơn vị.

## 4. Tạo thu hoạch (thay cho "kế hoạch thu theo đơn")

- Khi tạo lần thu hoạch, người dùng chọn **bè** (một bè), các **làn** thu, **số lồng** (cho phép số lẻ), và **nhân viên cùng làm** (chọn nhiều người, ưu tiên những người đã được phân công cho bè đó trong ngày, vẫn chọn được người khác). Lưu danh sách nhân viên vào lô.
- Không tính chỉ tiêu theo người (không KPI). Số lồng theo loại cho người mua do bên bán hàng của đồng đội xử lý.
- Gợi ý bè để thu chỉ dựa trên dữ liệu có thật: làn đang nuôi, không hỏng, chưa thu xong, số ngày kể từ lần thả. **Không bịa dữ liệu**, không ước lượng cân nặng hay số lồng có sẵn, không ánh xạ "hàu béo/sữa/sống" (đó là dữ liệu thử nghiệm).
- Bỏ mọi ước lượng "bao nhiêu ngày thu xong". Thu trong ngày là bình thường.
- Một nhân viên được làm ở **hai bè trong cùng một ngày** (mỗi bè là một lô riêng).

## 5. Quyết định D1 đến D12 sau khi chủ điều chỉnh

| # | Kết quả |
|---|---|
| D1 | **Giữ BR-FARM-04** (không thêm làn khi chu kỳ mở; không gỡ làn giữa bè) |
| D2 | Ghi sự kiện mất giống không số lượng khi ngừng hoạt động làn đang có giống |
| D3 | Không đánh số lại |
| D4 | Không có trạng thái "Đang sửa" |
| D5 | Không thêm tên riêng cho bè |
| D6 | Không ngưỡng "đủ tuổi thu"; chỉ hiển thị số ngày nuôi |
| D7 | **Bỏ**: không có "đợt thu của đơn", không gộp lô; một lô là một bè |
| D8 | **Bỏ** phần đơn (đồng đội làm). Trần so với kg mục tiêu của chu kỳ vẫn như đã làm (cảnh báo trên 110%, chặn trên 150%) |
| D9 | Không chuyển giống sang làn khác |
| D10, D11 | **Bỏ** (liên quan đơn) |
| D12 | **Bỏ** (liên quan kế hoạch theo đơn) |

## 6. Loại công việc và đơn giá (chủ nêu: chưa cấu hình được số tiền, phải sửa trong lịch sử đơn giá)

Màn "Loại công việc & đơn giá": tab Thông tin chỉ hiện đơn giá hiện tại, còn việc đổi giá phải sang tab "Lịch sử đơn giá". Như vậy dễ nhầm và dễ sai. Cải tiến đã chốt:
- Tab Thông tin hiện **"Đơn giá hiện tại: 50.000 ₫/giờ (hiệu lực từ dd/MM/yyyy)"** và nút **"Đổi đơn giá"**. Bấm thì mở ngay tại chỗ ô nhập đơn giá mới (ô tiền, có đơn vị ₫/giờ), **ngày bắt đầu hiệu lực** (mặc định hôm nay, không nằm trong kỳ lương đã chốt) và ghi chú, rồi Bỏ qua/Lưu. Lưu là tạo một phiên bản đơn giá mới.
- Tab "Lịch sử đơn giá" chỉ để **xem** các phiên bản (đơn giá, từ ngày, đến ngày, người đổi, ghi chú); phiên bản đã dùng để tính lương hoặc thuộc kỳ đã chốt không sửa được.
- Khi tạo loại công việc mới, có ô đơn giá ban đầu và ngày hiệu lực.
- Kiểm tra logic: đơn giá phải lớn hơn 0; hai phiên bản không chồng ngày; không đổi giá ngược về kỳ đã chốt (hiện khóa theo kỳ lương đã chốt); hiển thị rõ đơn vị.

## 7. Câu hỏi còn lại đã trả lời

- Một nhân viên làm hai bè cùng ngày: **được**.
- Hằng số 20 lồng mỗi người mỗi ngày: **không dùng** (chỉ là ước lượng của đồng đội, không phải luật của ta).
- Ảnh sự cố: **tùy chọn**.
- Hàu béo, hàu sữa, hàu sống loại nhỏ: **dữ liệu thử nghiệm**, không dùng để ánh xạ hay lập luận.
