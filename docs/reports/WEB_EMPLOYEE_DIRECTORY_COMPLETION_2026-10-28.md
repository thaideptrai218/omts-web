# Hoàn thiện danh sách nhân viên — lọc vùng và phân trang

Ngày 28/10/2026, Asia/Saigon. Tiếp tục trên `feature/OMTS-132-web-foundation` từ `47c4459`. Lượt này hoàn thiện phần UI/mock không bị chặn bởi MSG06, tên MSG24 hoặc auth runtime; chưa bật API/refresh.

## Nguồn và quyết định

Đã đọc lại Jira OMTS-203, parent OMTS-119 và dependency OMTS-199. LAB-01 yêu cầu tìm tên/SĐT với debounce300ms, lọc trạng thái/vùng, thông tin vùng và tài khoản trong hàng, phân trang20. UC10 trong Report3 vẫn xác định Owner quản lý hồ sơ toàn HTX; vùng làm việc không tự cấp AccessGrant. Ticket còn To Do không được coi là nghiệm thu tính năng.

**Người dùng đã chốt ngày28/10:** “Đang làm việc — theo Jira (đề xuất)” cho trạng thái mặc định khi mở danh sách. UI vẫn cho chọn All/Left; Xóa bộ lọc đưa về tất cả để xem cả hồ sơ đã nghỉ. Không đổi trạng thái, khóa tài khoản hoặc tự xóa hồ sơ. Vùng ngừng vẫn tra cứu được trong danh sách; điều này khác với quy tắc không cho gán thêm vùng ngừng trong editor.

## Các micro-task

1. **EMP-LIST-01 — Chọn dữ liệu.** Hàm thuần `selectEmployeePage` lọc toàn workspace theo tên/SĐT, tình trạng làm việc, liên kết tài khoản và ID vùng, rồi mới chia trang20. Không sort hoặc mutate mảng nguồn. Nhân viên nhiều vùng chỉ xuất hiện một lần; trang vượt giới hạn được đưa về trang cuối hợp lệ, danh sách rỗng không hiện phân trang.
2. **EMP-LIST-02 — Hiển thị.** Truyền catalog vùng từ workspace vào list, thêm filter và nhãn vùng trong hàng. Vùng lịch sử không bị bỏ khỏi khả năng tra cứu. ID chưa có trong catalog chỉ hiển thị số lượng thiếu, không lộ ID kỹ thuật hoặc bịa tên; nếu catalog mất mục đang lọc, select giữ ID và ghi rõ không còn trong danh mục. Badge trạng thái tài khoản tách khỏi tình trạng nhân viên, người chưa có account được ghi rõ.
3. **EMP-LIST-03 — Tìm kiếm và phân trang.** Input cập nhật ngay; kết quả áp dụng sau300ms. Timer cũ bị hủy khi gõ tiếp/unmount. Xóa query trả toàn kết quả ngay, reset không để query cũ quay lại. Đổi filter/query về trang1; có range kết quả và nút trước/sau, vô hiệu hóa đúng đầu/cuối. Không gọi API, lưu filter vào storage hoặc đổi policy cache/session.
4. **EMP-LIST-04 — Ghép editor.** Test đi qua parent/editor/service/mock: mở An, đổi Đông sang Nam, lưu, hàng biến khỏi filter Đông; chọn Nam thấy hàng mới, mở lại đúng profile và account link giữ nguyên. Đây là test ghép luồng mock, không phải .NET/QA end-to-end.

## Các lỗi và giới hạn phát hiện trong lượt làm

Lần chạy `npm test -- src/features/employee-management/components/employee-list-workflow.test.tsx src/features/employee-management/components/employee-list.test.tsx` có2 fail/6 pass. Testing Library không tìm được button có tên bắt đầu `Nhân viên 20 ` hoặc `Nhân viên 44 `, dù trang/dữ liệu đã đúng. Đọc danh sách accessible roles thấy tên là `Nhân viên 200901234567...`: các span tên/SĐT/trạng thái không có khoảng trắng trong accessible name. Đã thêm khoảng trắng giữa các phần; không nới regex hoặc đổi dữ liệu để che lỗi. Chạy lại8/8 đạt; các test mới tiếp tục kiểm ID mở hồ sơ ở trang2 và kết quả search ở trang3 cũ.

Hallmark static audit lần đầu trên ba component có2 FAIL,2 REFLEX,1 WARN: range dùng dấu gạch, focus styling không có tại file, trạng thái active/disabled không có tại file và ellipsis ba chấm. Đã dùng “đến” cho khoảng số, thêm focus-visible/active cho hàng và đổi ellipsis. Lượt audit xác nhận còn0 FAIL/1 REFLEX/0 WARN: thiếu disabled tại file list. Không thêm disabled giả cho bộ lọc chỉ đọc; nút pagination dùng Button chung đã có disabled styling, các bộ lọc không gây mutation. Đây là chấp nhận có lý do trong phạm vi màn quản trị, không phải bỏ qua lỗi của nút đang cần disabled.

Chỉ chạy Hallmark ở mức source; không gọi kết quả này là audit render đầy đủ. Kiểm hình ảnh và tương tác browser được ghi riêng ở dưới. Giữ palette/token xanh biển, không đổi theme, thêm hero hoặc thay shell quản trị.

Tab cổng3000 được kiểm đầu lượt vẫn phục vụ build cũ, chưa có filter vùng; login mock thành công nhưng không dùng ảnh tab đó làm bằng chứng UI mới. Dùng thư mục build kiểm thử riêng để tránh ghi đè `.next` của server đang phục vụ người dùng. Không dừng hoặc đổi cấu hình server3000.

### P3 EMP-LIST-REV-01 — Focus sau khi xóa bộ lọc

Browser cho thấy nút Xóa bộ lọc biến khỏi DOM sau khi chuyển về tất cả; khi nút đó có focus, vị trí thao tác bị mất. Bổ sung kiểm focus vào test mặc định trạng thái, focus nút reset rồi bấm và yêu cầu focus chuyển về ô tìm kiếm. Lệnh `npm test -- src/features/employee-management/components/employee-list-workflow.test.tsx -t 'starts with employed staff'` trước sửa:1 fail/11 skip, expected true/received false tại kiểm activeElement. Không phải lỗi giá trị filter hoặc timer.

Sửa bằng ref tới input tìm kiếm, gọi focus trước khi reset state làm nút biến mất. Không dùng querySelector toàn cục hoặc timer khôi phục trễ. Toàn12 test workflow đạt sau sửa; test vẫn kiểm trạng thái chuyển về All và hồ sơ Left được xem lại. Tổng số ca mới vẫn19 vì mở rộng kiểm tra trong ca mặc định đã thêm, không đếm một assertion thành một test riêng.

## Kiểm chứng

Đã thêm **19 test mới**:6 hàm chọn trang,12 workflow danh sách và1 luồng editor→save→filter. Ba test list cũ được giữ và cập nhật chờ debounce đúng300ms. Các ca kiểm liên kết/status mặc định, vùng ngừng/thiếu catalog, kết hợp filter, tìm toàn danh sách, cuối trang, dữ liệu giảm, hủy timer và reset.

Đã kiểm bản source riêng trên nền commit47c4459, chỉ chép10 file source mới/thay đổi thuộc employee-management. Các sửa đổi hồ sơ/thông báo/Dialog local từ trước không nằm trong bản kiểm này. Đối chiếu hash cả10 file với source hiện tại: khớp. Lint/typecheck/test/build được chạy tuần tự, không chạy build khi full suite còn hoạt động.

| Kiểm cuối sau bản vá focus | Kết quả |
| --- | --- |
| `npm test` | **2.102 pass / 31 Redis skip**,173 file pass / 4 skip;98,65 giây |
| `npm run lint` | Đạt, không warning |
| `npm run typecheck` | Đạt |
| `npm run build` | Đạt,18/18 trang |
| `npm run test:session-pages` | Đạt24 HTTP assertions |
| Static Hallmark |0 FAIL / 1 REFLEX có giải thích / 0 WARN |
| Diff và liên kết tài liệu | Đạt; bài113, ảnh và log được ignore |

Các kết quả2.101 trước khi chốt default hoặc2.102 trước vá focus là bằng chứng trung gian; bảng trên là lần kiểm sau source cuối.31 skip không được tính thành pass hoặc nghiệm thu Redis thật. Số test không bao gồm14 ca thuộc phần local hồ sơ/thông báo khác, không dùng số working tree khác phạm vi để báo cáo.

### Browser trên build mới

Đã đăng nhập Owner mock ở `http://127.0.0.1:3105`, mở Nhân viên bằng điều hướng của ứng dụng. Mặc định Employed hiển thị2/3 hồ sơ; chọn vùng Nam còn1/3, xóa lọc thấy3/3 gồm Bình đã nghỉ và tài khoản bị khóa. Không thay trạng thái hồ sơ/account trong browser.

Sau bản vá focus, đã dựng lại build và kiểm native: bấm Xóa bộ lọc đưa activeElement về `employee-search`; gõ090222, thấy Đang tìm… rồi còn1/3, đúng Bình. Reset lần nữa trả3/3, không có query cũ quay lại. Độ trễ chính xác299/300ms được kiểm bằng fake timer, không suy đoán từ tốc độ tool browser.

Ở1024px: document.scrollWidth1009, viewport1024; list.scrollWidth863. Ở360px: document.scrollWidth345, viewport360; list.scrollWidth311. Không tràn ngang; toolbar hai cột ở khung vừa và một cột ở khung hẹp, hàng xuống dòng cho vùng/account. Ảnh final lưu local tại `.hallmark/employee-directory-1024.png` và `employee-directory-360.png`. Đã reset viewport. Dữ liệu mẫu chỉ có3 nhân viên nên phân trang45 người được nghiệm thu bằng test component, chưa tuyên bố thao tác native trên dataset45.

Bản xem thử3105 được giữ chạy với mock để người dùng review; tab kiểm được giữ lại. Cổng3000 vẫn phục vụ build cũ, không bị stop/rebuild. Reload preview có thể yêu cầu đăng nhập lại do mock session trong RAM; chưa đổi chính sách session để che khác biệt đó.

## Phần chưa được đóng

Paging hiện áp dụng lên workspace mock đã tải đầy đủ. Khi ghép backend phân trang phải dùng total/page từ API, không lọc tiếp một trang rồi giả đó là toàn bộ kết quả. Chưa thêm endpoint, client HTTP, route/DAL, create-account inline, nghỉ việc/đi làm lại hoặc MSG06/MSG24 metadata.

Tự đánh giá: EMP-LIST-01–04 hoàn tất trong phạm vi danh sách mock và phần kiểm được nêu trên; P3 focus reset đã có RED/GREEN và kiểm native sau sửa. Không phát hiện lỗi mới còn mở trong phạm vi này. Không đánh dấu toàn LAB-01/Jira Done. Các sửa đổi local hồ sơ/thông báo/Dialog từ trước được giữ nguyên; bài học/ảnh/log tiếp tục ignore. Chưa commit/push trong lượt triển khai này, không merge develop.

## Review trước xuất bản — 28/10/2026

Review lại theo chuỗi nhập → debounce → chọn trang → đổi filter → lưu editor, đồng thời kiểm tên truy cập của hàng có nhiều vùng. Các kết quả ở trên thuộc lượt triển khai trước; phần này ghi kiểm chứng source chuẩn bị commit. Đọc lại OMTS-203 và parent OMTS-119, giữ nguyên WEB-EMP-LIST-01/WEB-EMP-ZONE-01 và các cổng API/MSG đang mở.

### P3 EMP-LIST-REV-02 — Chuyển trang trong lúc từ khóa chưa áp dụng

Khi gõ từ khóa, code đặt trang về1 ngay nhưng debounce chưa áp dụng query mới. Trong300ms đó, nút Trang sau vẫn hoạt động trên kết quả cũ; bấm nút rồi chờ có thể đưa query mới lên trang2. Test với65 hồ sơ kiểm disabled của hai nút khi query đang chờ, thử bấm và xác nhận kết quả mới ở trang1. Lệnh `npm test -- src/features/employee-management/components/employee-list-workflow.test.tsx -t 'keeps paging disabled|separates multiple'` trước sửa có2 fail/12 skip; ca này expected disabled=true, actual=false.

Sửa: truyền isSearching vào pagination, thêm aria-busy và disabled cho nút trước/sau trong lúc chờ. Search input vẫn nhập được, timer tiếp tục hủy khi gõ tiếp/unmount; không đổi filter, thứ tự dữ liệu hoặc chính sách retry/caching. Đây là khóa tạm hành động UI trước khi có kết quả query hiện tại, không phải thêm bước xác nhận nghiệp vụ.

### P3 EMP-LIST-REV-03 — Nhiều tên vùng bị nối trong accessible name

Ca còn lại của lệnh trên không tìm được hàng có tên chứa “Khu Đông Khu Nam”. Hai chip nhìn có khoảng cách CSS nhưng text DOM bị nối thành “Khu ĐôngKhu Nam”. Đặt khoảng trắng giữa các chip bằng Fragment có key, giữ nguyên tên/catalog/ID. Lần thử đặt khoảng trắng cuối bên trong span vẫn còn1 fail/13 pass vì text từng phần tử được chuẩn hóa; đã chuyển dấu cách ra giữa hai phần tử rồi chạy lại14/14 đạt. Test kiểm accessible name qua getByRole, không đổi regex thành chấp nhận hai tên dính nhau.

Hai ca được bổ sung vào file workflow, nâng file lên14 test và tổng mới của lát danh sách từ19 lên21. Ghi chú học local được cập nhật; kết quả full source tách sẽ ghi trước commit. Các thay đổi local hồ sơ/thông báo/Dialog tiếp tục nằm ngoài phạm vi xuất bản. Chưa merge develop, không bật API/refresh, MSG06 và tên MSG24 chờ backend.

### Lỗi kiểm chứng ngoài module: timeout tiến trình test Redis

Lượt `npm test` đầu trên bản source từ index có1 fail/2.103 pass/31 skip,552,68 giây. File `redis-test-command.test.ts`, ca invalid-config, báo `spawnSync C:\Program Files\nodejs\node.exe ETIMEDOUT`: subprocess chưa kết thúc trong15 giây nên chưa có kết quả để kiểm thông báo từ bốn suite. Đây không phải response lỗi của Redis thật; ca này chỉ chạy endpoint cố tình sai. Build/HTTP bị chặn bởi exit code test, không phải thêm hai lỗi ứng dụng.

Lượt này đã chạy tuần tự, không có build song song. Log có import421,42 giây/environment48,45 giây, khác hẳn các lượt kiểm trước; chưa xác định được nguyên nhân hạ tầng gốc nên không khẳng định tranh tài nguyên hoặc đã sửa môi trường. Không thay timeout, workflow hoặc source Redis. Chạy riêng `npm test -- src/server/auth/redis-test-command.test.ts` trên cùng Node24.13.1/source:4/4 pass trong3,28 giây. Sau đó chạy lại full suite để kiểm xác nhận; không dùng isolated pass để gọi toàn bộ suite đạt.

### Kết quả source chuẩn bị commit sau review

Full suite xác nhận: **2.104 pass/31 Redis skip**,173 file pass/4 skip,96,12 giây. Lint/typecheck đạt; build18/18 và24 HTTP assertions đạt. Static Hallmark vẫn0 FAIL/1 REFLEX đã giải thích/0 WARN. Tất cả10 file source được stage khớp hash bản kiểm từ Git index; không gom các sửa đổi hồ sơ/thông báo/Dialog local. Không đổi dependency, env, backend, scanner hoặc timeout.

Hai lỗi P3 REV-02/03 đã sửa với test hồi quy14/14. Không phát hiện lỗi còn mở trong phần danh sách đã kiểm; timeout subprocess là finding kiểm chứng đã tái kiểm đạt, nguyên nhân hạ tầng gốc chưa kết luận. Browser360/1024 trong phần trên là bằng chứng bố cục của lượt triển khai trước; hai bản vá review này được kiểm bằng component tests, không tự nhận đã thử pagination65 người trên native browser. Bài113 giữ local. Xuất bản trên nhánh hiện tại, PR vẫn draft và chưa merge develop; API/refresh vẫn tắt, MSG06/tên MSG24 chờ backend.
