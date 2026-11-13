# Luồng sử dụng OMTS

**Cập nhật:** 12/11/2026. **Phạm vi hiện tại:** Nuôi trồng (từ mua giống đến tổng kết). Các module khác sẽ bổ sung sau.

Tài liệu này viết cho người dùng và đội kỹ thuật: ai làm bước nào, nhập gì, ảnh nào, quy tắc gì, thông báo ra sao, nối tới màn nào. Quy tắc nghiệp vụ đầy đủ ở [SRS_DEVIATIONS.md](./SRS_DEVIATIONS.md); chi tiết kỹ thuật ở [PART_B](./reports/farming-flow/PART_B_CYCLE_SEEDING_HARVEST.md).

**Cách đọc trạng thái:** "Đã làm" nghĩa là backend đã commit và Web đã triển khai (chưa kiểm chứng với API thật trừ khi ghi rõ). "Chờ" nghĩa là chưa có mã. Mọi số mảnh ghi đơn vị **mảnh**. Mọi số sống sót và hao hụt ươm ghi nhãn **ước tính**.

## Nuôi trồng

### Chuỗi tổng quan

```
Mua giống -> Ươm -> Kế hoạch -> Thả giống -> Nuôi -> Thu hoạch -> Tổng kết
 (Phiếu nhập)  (đợt ươm)  (chia bè,     (làn)      (% làn,      (lô thu,      (khối ươm
                          tạo chu kỳ)               sự cố,       yêu cầu mua,   + kết quả
                                                    nhật ký)     crew)          nuôi)
```

| Bước | Màn (menu) | Ai làm | Trạng thái |
|---|---|---|---|
| 1. Mua giống | Vật tư & mua hàng → Phiếu nhập (`/operations/purchase-receipts/new`) | Quản lý vùng lập; Owner theo dõi | Đã làm |
| 2. Ươm | Nuôi trồng → Ươm giống (`/farming/nursery`) | Owner; Quản lý vùng trong vùng | Đã làm (Web chưa kiểm chứng với API) |
| 3. Kế hoạch | Ươm giống → Hoàn tất ươm (tạo chu kỳ); xem tại Chu kỳ nuôi (`/farming/cycles`) | Owner; Quản lý vùng trong vùng | Đã làm (backend); Web W2 |
| 4. Thả giống | Nuôi trồng → Thả giống | Owner; Quản lý vùng trong vùng | Đã làm (backend); form từ phần chia chờ W3 |
| 5. Nuôi | Bè nuôi, Chu kỳ nuôi (tiến độ làn), Nhật ký chăm sóc, Sử dụng vật tư (`/inputs/uses`) | Owner; Quản lý vùng trong vùng | % làn và ảnh sự cố chờ B2 |
| 6. Thu hoạch | Nuôi trồng → Thu hoạch | Owner; Quản lý vùng trong vùng | Yêu cầu mua và crew đã làm; % làn và ảnh bắt buộc chờ B2 |
| 7. Tổng kết | Chu kỳ nuôi → Tổng kết; Sản lượng nuôi | Owner; Quản lý vùng (đóng sớm cần Owner đồng ý) | Đã làm (API); màn đóng chu kỳ trên Web chưa có |

Kế toán không dùng các bước 2 đến 7 (SRS và bảng quyền trong PART_B mục 0.5). Đóng lô và xem sản lượng nuôi: Owner và Quản lý vùng.

---

### Bước 1. Mua giống (thành lô giống)

| Mục | Nội dung |
|---|---|
| Ai | Quản lý vùng lập phiếu nhập; Owner theo dõi và nhận thông báo |
| Trường nhập | Nhà cung cấp, ngày nhận, dòng hàng (vật tư nhóm Giống, số lượng tối đa 2 chữ số thập phân, đơn giá, mã lô của nhà cung cấp, bè mua cho, nếu có) |
| Ảnh | Không yêu cầu |
| Quy tắc | Chỉ phiếu **Completed** mới thành lô giống. Mã lô = mã phiếu + số dòng (ví dụ `PN000123-1`). Chỉ lô còn tồn mới chọn được để ươm. Hủy phiếu bị chặn nếu lô đã tiêu thụ (thả giống, xuất dùng, kể cả xuất dùng cho đợt ươm) |
| Thông báo | `MSG-PURCHASE-01` cho Owner khi phiếu Completed (có sẵn) |
| Liên kết | Lô giống -> đợt ươm -> chu kỳ -> truy xuất lô (nhà cung cấp, phiếu nhập) |

---

### Bước 2. Ươm (bắt đầu và theo dõi)

**Màn:** Nuôi trồng → Ươm giống (`/farming/nursery`). Nút "Bắt đầu ươm" mở pop-up hai bước.

| Mục | Nội dung |
|---|---|
| Ai | Owner (mọi vùng); Quản lý vùng (trong vùng của mình). Kế toán và nhân viên không |
| Trường nhập | Vùng ươm; lô giống (hiện tồn kho và đơn vị mảnh); số mảnh đưa vào (không vượt tồn); ngày bắt đầu (mặc định hôm nay); ghi chú (tùy chọn, tối đa 1000 ký tự) |
| Ảnh | **1 đến 3 ảnh** (JPEG hoặc PNG, mỗi ảnh tối đa 10 MB). Thiếu ảnh hoặc ảnh lỗi thì không lưu gì |
| Bảng xem lại | Vùng, lô giống, nhà cung cấp, số mảnh, tồn trước, tồn sau. Xác nhận mới lưu |
| Quy tắc | Một đợt ươm dùng **một lô giống**, **một vùng**, không chọn bè. Số mảnh **luôn** không vượt tồn (kể cả khi hợp tác xã cho phép tồn âm). Kho trừ ngay bằng một phiếu Xuất dùng mục đích Nursery (mã `XD…`) |
| Sửa | Chỉ khi đợt còn **Đang ươm**: số mảnh (phiếu xuất điều chỉnh theo), ngày, ghi chú, ảnh (vẫn 1 đến 3) |
| Hủy | Chỉ khi **Đang ươm**, lý do bắt buộc. Phiếu xuất chuyển Đã hủy, kho hoàn lại |
| Trạng thái | Đang ươm -> Đã hoàn tất, hoặc Đang ươm -> Đã hủy. Không có đường lui. **Đã hoàn tất không hủy được** |
| Thông báo | Quản lý vùng bắt đầu, sửa hoặc hủy: Owner nhận `NURSERY_RECORDED` ("Nursery started", "edited", "cancelled"), mã chung `MINI_APP_NOTIFICATION`. Owner tự làm thì không báo |
| Liên kết | Lô giống (Vật tư & Giống), phiếu Xuất dùng, lịch sử đợt (tab Lịch sử) |

**Lỗi thường gặp:** thiếu tồn (409, màn hiện tồn còn lại); ảnh sai định dạng hoặc quá dung lượng (400, trường `Photos`); vùng đã ngừng sử dụng (400, trường `Zone`).

---

### Bước 3. Kế hoạch (hoàn tất ươm và tạo chu kỳ)

**Màn:** Ươm giống → chi tiết đợt Đang ươm → Hoàn tất ươm (pop-up hai bước).

| Mục | Nội dung |
|---|---|
| Ai | Owner; Quản lý vùng trong vùng |
| Trường nhập | **Số mảnh sống sót** (ước tính bằng mắt, từ 0 đến số mảnh vào, ghi nhãn ước tính); ngày hoàn tất (mặc định hôm nay; không trước ngày bắt đầu, không sau hôm nay); **chia bè**: chọn một hoặc nhiều bè cùng vùng, nhập số mảnh cho từng bè ("chia đều theo số làn" để nhập nhanh, phần dư làm tròn để tổng khớp); sản lượng dự kiến từng bè (kg, tùy chọn) |
| Ngày thu dự kiến | **Đã bỏ.** Không còn trong kế hoạch chu kỳ (cột CSDL giữ, không hiển thị) |
| Ảnh | **1 đến 3 ảnh** cho lần hoàn tất. Ảnh này dùng chung cho các chu kỳ tạo ra ở bước này |
| Bảng xem lại | Mảnh vào, sống sót (ước tính), hao hụt ươm (ước tính, số mảnh và %), phân chia từng bè, sản lượng dự kiến từng bè. Xác nhận mới lưu |
| Quy tắc | Tổng phần chia **bằng đúng** số sống sót. Mỗi bè cùng vùng, không có chu kỳ đang mở, không trùng, mỗi phần > 0. Vùng chưa có bè: nút "Tạo bè nuôi cho vùng này". Sống sót 0: không tạo chu kỳ nào. Một giao dịch: lỗi thì không lưu gì. Hai người cùng hoàn tất: một bên nhận xung đột (MSG06) |
| Kết quả | Đợt chuyển **Đã hoàn tất**. Mỗi bè một chu kỳ mới, ngày bắt đầu = ngày hoàn tất, số mảnh dự kiến = phần chia |
| Sửa sau hoàn tất | **Sửa số sống sót** (kèm lý do): hiện "cũ → mới", không nhỏ hơn số đã thả. **Chia lại** phần giữa các bè: dồn về một bè hoặc chia nhiều bè, tổng vẫn bằng sống sót. Bè đã thả giống hoặc có nhật ký không được gỡ. Chu kỳ đã đóng thì phần chia đóng băng |
| Thông báo | Quản lý vùng hoàn tất, sửa sống sót hoặc chia lại: Owner nhận `NURSERY_RECORDED` |
| Liên kết | Chu kỳ nuôi (`/farming/cycles`), Bè nuôi (`/farming/rafts`) |

**Ghi chú:** sống sót nhập **một lần** lúc hoàn tất, không ghi hao hụt dần trong lúc ươm. Hệ thống không cảnh báo khi hao hụt ươm cao (chủ dự án chốt).

---

### Bước 4. Thả giống

**Màn:** Nuôi trồng → Thả giống (chọn bè, mở tab Thả giống).

| Mục | Nội dung |
|---|---|
| Ai | Owner; Quản lý vùng trong vùng |
| Trường nhập | Làn (lưới chọn nhanh, chỉ làn thả được) và % từng làn; ngày thả; số mảnh (chỉ chu kỳ không qua ươm). Ảnh 1 đến 3: **bắt buộc** |
| Với chu kỳ từ ươm | **Không chọn lô giống** (lô lấy từ đợt) và **không chọn số lượng** (13/11): thả **đủ 100%** phần đã chuyển sang bè. Hiện "Còn X trên Y mảnh đã chuyển" và dòng chỉ đọc "Số lượng thả: X mảnh · toàn bộ phần đã chuyển sang bè (không chọn số lượng)". Hết phần: "Đã thả hết phần đã chuyển sang bè", khóa Lưu. Muốn số khác: sửa số sống sót hoặc chuyển phần chia giữa các bè **trước khi thả** |
| Quy tắc | Số thả của chu kỳ từ ươm = phần chia còn lại; gửi số khác thì 400 `NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION`, hết phần thì 400 `NURSERY_SEEDING_ALREADY_COMPLETE`; 409 `NURSERY_SEEDING_ABOVE_ALLOCATION` giữ làm lớp chặn an toàn. Sửa bản ghi cũng giữ đủ 100%. Không còn mức 110% và 150% cho chu kỳ từ ươm. **Không tạo phiếu Xuất dùng** (đã trừ kho lúc ươm). Làn đang thu hoạch hoặc đã thu hoạch không thả lại. Làn hỏng hoặc ngừng hoạt động bị chặn |
| Thông báo | Không (như trước) |
| Liên kết | Đợt ươm, chu kỳ, lô giống (truy xuất lô) |

**Chu kỳ không qua ươm** (dữ liệu cũ, hoặc đường cũ còn mở): vẫn chọn lô giống, vẫn có mức 110% hỏi xác nhận và 150% chặn, vẫn trừ kho. PM chưa quyết định có khóa đường này không (xem [SRS_DEVIATIONS.md](./SRS_DEVIATIONS.md) mục 11, Q21). Chu kỳ cũ không có đợt ươm: báo cáo ghi "không có ươm".

---

### Bước 5. Nuôi

| Việc | Ai | Nhập | Ảnh | Quy tắc và trạng thái |
|---|---|---|---|---|
| Tiến độ làn | Owner; Quản lý vùng | % đã thả (mặc định 100 khi thả đủ), % đã thu, lý do khi chỉnh | Không | Mỗi làn 0 đến 100%; cộng dồn không vượt 100% trong chu kỳ. Trạng thái làn suy ra từ %. Chỉnh có nhật ký. **Chờ B2** (API). Nhập % ngay trong form thả và thu: chờ W3. Sơ đồ cột ngang đã làm (Web W1) |
| Sự cố làn | Owner; Quản lý vùng | Khi nào, làn nào, hỏng thế nào (bắt buộc) | **1 đến 3 ảnh, bắt buộc** (chờ B2) | Làn hỏng giữ trạng thái cũ, chỉ chặn thả và thu. Ngừng hoạt động là một chiều |
| Nhật ký chăm sóc | Owner; Quản lý vùng | Ngày, ghi chú (tùy chọn) | Tùy chọn, tối đa 3 | Owner nhận `MSG-CYCLE-04` |
| Sử dụng vật tư | Quản lý vùng | Vật tư, số lượng, lý do | Tùy chọn | Trừ kho bằng phiếu Xuất dùng "Sửa chữa bè" (`/inputs/uses`) |

---

### Bước 6. Thu hoạch

**Màn:** Nuôi trồng → Thu hoạch (chọn bè, tab Thu hoạch). Mỗi chuyến tạo một lô thu hoạch.

| Mục | Nội dung |
|---|---|
| Ai | Ghi: Owner, Quản lý vùng trong vùng. Sửa và gỡ: người ghi hoặc Owner |
| Trường nhập | Làn thu (làn Đang nuôi hoặc Đang thu hoạch); đánh dấu "thu hết" cho làn đã thu xong; **số lồng** (số thập phân 2 chữ số, ví dụ 0,5, > 0, ≤ 100.000); kg ước tính (để trống = số lồng × kg mỗi lồng hiện hành; sửa tay được); nhóm nhân viên cùng thu (tùy chọn, nhiều người); **yêu cầu mua đã chấp nhận** (bắt buộc khi ghi); % thu theo làn (chờ B2 và W3) |
| Ảnh | Lô mới: **1 đến 3 ảnh bắt buộc** (chờ B2; hiện ảnh tùy chọn tối đa 10) |
| Quy tắc | Không bị chặn theo mục tiêu chu kỳ (Owner, 12/11): màn hiện mục tiêu và phần còn lại, phần còn lại có thể âm. Lô chỉ ghi khi chu kỳ đang mở. Thời điểm thu do máy chủ ghi, không ghi bù ngày đã qua. Làn đã thu hết không chọn lại. Sửa và gỡ lô cần lý do. Gỡ bị chặn nếu lô đã nằm trên hóa đơn |
| Thông báo | `MSG-HARVEST-01` cho Owner khi ghi lô. `MSG-CYCLE-08` khi làn có giống cuối cùng được thu xong (nhắc đóng chu kỳ) |
| Liên kết | Yêu cầu mua (`/operations/purchase-requests`), lô thu hoạch, truy xuất lô, sản lượng nuôi |

**Ngoài ra:** "Thu xong làn" và "hoàn tất nhiều làn một lần" (tất cả hoặc không gì) đã có ở backend.

---

### Bước 7. Tổng kết chu kỳ

| Mục | Nội dung |
|---|---|
| Ai | Xem: Owner, Quản lý vùng trong vùng. Đóng: Owner đóng trực tiếp; Quản lý vùng đóng sớm cần Owner đồng ý. Kế toán không xem |
| Khối "Ươm" | Mã đợt, số mảnh vào, sống sót (ước tính), hao hụt (ước tính, số mảnh và %). Chu kỳ không từ ươm: báo "không có ươm" |
| Khối nuôi | Số giống đã thả, kg thu (ước tính), số lô, số ngày nuôi, làn mất giống và làn hỏng kèm lý do, còn lại so với mục tiêu |
| Đánh giá | Bắt buộc khi đóng (tối đa 2000 ký tự) |
| Sản lượng nuôi | Thêm cột mảnh vào ươm, sống sót và hao hụt ươm theo chu kỳ (ước tính) |
| Liên kết | Chu kỳ nuôi (tab Tổng kết); menu Nuôi trồng → Sản lượng nuôi |

**Ghi chú:** API đóng chu kỳ đã có. Màn đóng chu kỳ trên Web **chưa có** (xem PART_B mục 3.3 Luồng 5). Ngày thu dự kiến đã bỏ khỏi tổng kết.

---

## Quy tắc chung của Nuôi trồng

| Quy tắc | Nguồn |
|---|---|
| Ảnh: 1 đến 3 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB; lỗi trả 400 với trường `Photos`. Chỉ áp dụng cho bản ghi mới | Đặc tả 10.2 và 10.6 |
| Ảnh lưu local tạm (đĩa máy chủ qua `IFileStorage`). Cloud sẽ đổi bằng cấu hình, không đổi mã | `operations-reference.md` (backend) |
| Dữ liệu cũ (trước 12/11) giữ nguyên, không backfill | NUR-09 |
| Truy xuất công khai (QR) không đổi: ươm không hiện ra ngoài | NUR-13 |
| Quyền ươm dùng chung `CultivationCycles`, không mã riêng | NUR-11 (chờ PM xác nhận) |

## Trạng thái nhanh (12/11/2026)

| Phần | Backend | Web |
|---|---|---|
| Đợt ươm: bắt đầu, sửa, hủy, hoàn tất, chia lại, sửa sống sót | Đã commit (nhánh `feature/OMTS-132-nursery`) | Đã triển khai (W2, `/farming/nursery`), chưa kiểm chứng API thật |
| Thả giống từ phần chia | Đã commit | Chờ W3 |
| % làn, ảnh bắt buộc thả và thu, ảnh sự cố | Chờ B2 | Sơ đồ đã làm (W1); nhập % trong form chờ W3 |
| Yêu cầu mua khi thu hoạch, crew | Đã commit | Theo API |
| Đóng chu kỳ | Đã có API | Chưa có màn |
