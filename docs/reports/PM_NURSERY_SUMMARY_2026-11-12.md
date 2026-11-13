# Tóm tắt cho PM: ươm giống, ảnh, % làn (Nuôi trồng)

**Ngày:** 12/11/2026. **Đọc trong:** 5 phút. **Cần PM:** xác nhận các thay đổi SRS v8 bên dưới và trả lời câu hỏi mở. Chủ dự án đã chốt luồng; PM chưa duyệt phần SRS. Không merge vào `develop` khi PM chưa duyệt.

## 1. Vì sao có thay đổi

Thực tế HTX: mua mảnh hàu về, ươm cho quen nước rồi mới thả lên làn. SRS v8 dòng 446 ghi bước này "không được ghi nhận trong OMTS", nên hệ thống không biết ươm hao bao nhiêu và số thả có thể lệch kho.

## 2. Thay đổi SRS cần PM xác nhận

| # | Chỗ trong SRS v8 | Thay đổi đề xuất | Trạng thái làm |
|---|---|---|---|
| 1 | Dòng 446 (mô tả quy trình) | Bỏ "not recorded in OMTS", thêm bước **ươm bắt buộc** trước thả giống lần mới | Đã làm (backend, Web) |
| 2 | Use case mới | NURSERY-01 bắt đầu, -02 theo dõi/sửa/hủy, -03 hoàn tất và tạo chu kỳ, -04 sửa sống sót và chia lại; SCR-NURSERY-01..03; BR-NURSERY-01..07 | Đã làm |
| 3 | BR-CYCLE-07 ("no loss record") | Hoàn tất ươm **ghi số sống sót ước tính** (đếm bằng mắt). Hao hụt trong nuôi vẫn không ghi | Đã làm |
| 4 | GBR-04 và BR-PURCHASE-07 | Thả từ đợt ươm: **giới hạn cứng** theo phần chia, không chọn lô, không trừ kho lần nữa. Kho trừ **lúc bắt đầu ươm** | Đã làm (backend) |
| 5 | CYCLE-01, CYCLE-06 | Bỏ **ngày thu hoạch dự kiến** khỏi kế hoạch và tổng kết (cột CSDL giữ) | Đã làm (backend); form Web chờ |
| 6 | BR-HARVEST-07, CYCLE-06 | **Thu hoạch không bị chặn** theo mục tiêu chu kỳ (Owner quyết 12/11). Mục tiêu chỉ hiển thị. Trần 110%/150% chỉ còn cho thả giống | Đã làm (backend) |
| 7 | HARVEST-01 | **Thu hoạch gắn yêu cầu mua đã chấp nhận** (có sẵn từ nhóm bán hàng, chưa có trong SRS). Thêm **nhóm nhân viên cùng thu** (tùy chọn) | Đã làm (backend) |
| 8 | Ảnh (mới) | **Ảnh 1 đến 3 bắt buộc** cho: bắt đầu ươm, hoàn tất ươm, kế hoạch nuôi, thả giống, thu hoạch, sự cố làn. Nhật ký chăm sóc và vật tư giữ tùy chọn | Ươm: đã làm. Còn lại: chờ B2, W3 |
| 9 | BR-FARM-03 (làn) | Mỗi làn có **% đã thả** và **% đã thu** (cộng dồn không quá 100%), chỉnh có nhật ký. % thu **không** liên kết số lồng | Chờ B2 (API); Web sơ đồ đã làm |
| 10 | Thông báo | Quản lý vùng ghi ươm hoặc sửa: **báo Chủ HTX**. Dùng mã chung `MINI_APP_NOTIFICATION`, loại `NURSERY_RECORDED` | Đã làm |
| 11 | Quyền (mục 8, câu 6) | Ươm **dùng chung** quyền `CultivationCycles`, không có mã quyền riêng | Đã làm |
| 12 | Message | Lỗi ươm tạm dùng `MSG-GEN-09` + `reasonCode` `NURSERY_*`, chờ mã `MSG-NURSERY-xx` | Tạm |
| 13 | Truy xuất công khai (QR) | **Không đổi**, ươm không hiện ra ngoài | Đã làm |
| 14 | Lưu trữ ảnh (vận hành) | Ảnh lưu **local tạm** trên máy chủ; cloud sẽ đổi bằng cấu hình | Đã làm |

Quyết định 12/11 đã có trong mã: đợt đã hoàn tất **không hủy được**; kho **luôn chặn tồn âm** cho ươm; hoàn tất đóng chu kỳ được tạo cho từng bè trong cùng một giao dịch.

## 3. Câu hỏi còn mở

| # | Câu hỏi | Đề xuất của đội |
|---|---|---|
| Q21 | **Ươm có bắt buộc thật không?** Đường tạo chu kỳ cũ (không qua ươm) vẫn chạy: có chọn lô, 110%/150%, trừ kho. Khóa hay để tùy chọn? | Khóa cho bè mới; dữ liệu cũ giữ nguyên |
| Q22 | Mã SRS cho thông báo và lỗi ươm (`MSG-NURSERY-xx`) | PM đặt số |
| Q23 | Quyền ươm: xác nhận dùng chung `CultivationCycles` | Xác nhận |
| Q24 | Thu hoạch gắn yêu cầu mua: đưa vào SRS HARVEST-01 hay để ngoài | Đưa vào SRS |
| Q25 | Ảnh bắt buộc 1 đến 3 ở thả giống, thu hoạch, kế hoạch nuôi, sự cố làn: đưa vào SRS | Xác nhận |
| Q26 | Sau khi đã thả một phần, có cho chia lại phần giữa các bè (không dưới số đã thả)? | Có |
| Q27 | Khi Quản lý vùng sửa % làn, có báo Chủ HTX không? | Có, thông báo thường (chưa có trong backend) |
| Q28 | Không cảnh báo khi hao hụt ươm cao | Xác nhận (chủ đã chốt) |

## 4. Trạng thái và rủi ro

| Phần | Trạng thái 12/11 |
|---|---|
| Backend: đợt ươm, hoàn tất, chia lại, sửa sống sót, thả giống từ phần chia | Đã commit (nhánh `feature/OMTS-132-nursery`) |
| Backend: % làn, ảnh bắt buộc, ảnh sự cố | Đang làm (B2). Chưa commit |
| Web: màn Ươm giống (`/farming/nursery`) | Đã triển khai. **Chưa kiểm chứng với API thật** và chưa xác nhận ở 360 px và 1024 px |
| Web: sơ đồ làn cột ngang | Đã làm. Nhập % trong form thả và thu chờ W3 |
| Tài liệu | Đã cập nhật: `SRS_DEVIATIONS.md` mục 13-14, `SRS_CHANGE_LOG_HR` mục G.8, `USER_FLOWS.md`, `farming-flow` phần B |

**Rủi ro chính:**
- Đường cũ còn mở (Q21): ươm chỉ "bắt buộc" trên giấy nếu không khóa.
- Ảnh bắt buộc có thể cản nhập liệu: chỉ áp cho bản ghi mới, lỗi nêu rõ trường `Photos`.
- Số sống sót là ước tính: báo cáo phải ghi nhãn, không dùng như số đo.
- Web chưa chạy với API thật; cần QA luồng hoàn tất chia bè, quyền Owner và Quản lý vùng, và lỗi 404 và xung đột.

## 5. Tài liệu chi tiết

- Đặc tả chốt: `docs/reports/FARMING_NURSERY_STEP_SPEC_2026-11-12.md`
- Hợp đồng API: `docs/reports/FARMING_NURSERY_API_CONTRACT_2026-11-12.md`
- Khác biệt so với SRS: `docs/SRS_DEVIATIONS.md` (mục 11 có Q21 đến Q28)
- Luồng sử dụng: `docs/USER_FLOWS.md`
