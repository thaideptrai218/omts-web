# EMP-API-04a-E-UI — đưa lỗi vào form nhân viên

Ngày 28/10/2026, Asia/Saigon. Nhánh `feature/OMTS-132-web-foundation`, HEAD ban đầu `b60e9e7`. Backend giữ nguyên `develop@953f597`. Tiếp nối [báo cáo metadata](WEB_EMPLOYEE_ERROR_METADATA_REVIEW_2026-10-28.md).

## Kết quả

Form hiện có đã nhận được hai loại kết quả có cấu trúc: MSG01 chứa danh sách trường lỗi và MSG03 chứa ID hồ sơ nhân viên trùng. Đây là chuẩn bị ở phía UI/service contract, được kiểm bằng service giả lập trong test. Service instance của sản phẩm vẫn dùng mock repository; chưa nối adapter BFF, mount route, gọi API hay bật refresh thật.

Đối chiếu lại [OMTS-203](https://welterial.atlassian.net/browse/OMTS-203), phụ thuộc [OMTS-199](https://welterial.atlassian.net/browse/OMTS-199), ticket cha [OMTS-119](https://welterial.atlassian.net/browse/OMTS-119) và phần UC10 đã ghi trong báo cáo metadata. Không sửa Jira, SRS hoặc backend. Các thay đổi local có từ trước được giữ lại; chưa commit/push/merge.

## Từng micro-task

1. **Tách kiểu lỗi dùng chung.** Chuyển `EmployeeIssueTarget` và `EmployeeMutationProblem` sang domain. API mapper vẫn re-export để không phá các import cũ. `BindableEmployeeProblem` chỉ chọn MSG01/MSG03 đủ dữ liệu; kết quả MSG24 mới chưa có tên và `contract-blocked` không lọt vào contract form. MSG24/MSG06 mock cũ có đủ tham số vẫn giữ hành vi cũ.
2. **Hàm chuyển lỗi sang form.** `employee-editor-problem.ts` chọn các ô thực sự có trong form, gom field trùng và sắp focus theo thứ tự hiển thị. Ngân hàng, vùng làm việc và phiên bản không bị bỏ đi hoặc gán nhầm vào tên/SĐT: chúng xuất hiện trong phần tổng hợp. Không tạo input giả hoặc tự thêm bước chỉnh nhóm dữ liệu này.
3. **Hook nhận phản hồi.** `use-employee-editor-actions.ts` gắn mọi lỗi hợp lệ bằng `setError`, giữ các giá trị đang nhập và version cũ khi thao tác bị từ chối. Chỉ phản hồi unlink thành công mới cập nhật version như trước. Không reset form, tự retry, tự tải lại hoặc tự mở hồ sơ.
4. **Nhãn và mô tả lỗi.** `EmployeeEditorField` dùng label riêng, ID duy nhất theo editor và phần lỗi có ID riêng. Input liên kết lỗi bằng `aria-describedby`, đánh dấu `aria-invalid`; các trường tùy chọn cũng hiển thị lỗi. Dấu sao được bỏ khỏi tên truy cập; yêu cầu tên/SĐT vẫn như schema cũ, không thêm native validation.
5. **Mở hồ sơ trùng có chủ đích.** Giữ `existingEmployeeId` tới khi người dùng bấm nút. Nếu ID có trong workspace, mở đúng hồ sơ. Nếu chưa có, callback trả false, giữ editor/bản nháp và báo chưa mở được. Không kết luận hồ sơ không tồn tại, không tự GET detail hoặc tìm theo tên.
6. **Focus có kiểm soát.** Focus lỗi chạy sau commit của React và effect đóng xác nhận unlink. Có cleanup hủy frame và kiểm operation hiện hành; phản hồi hoặc lịch focus cũ không tác động editor đã đóng. Khi lỗi structured unlink sở hữu focus, không lên thêm lịch trả focus về tài khoản.

## Lỗi thực tế và cách sửa

Lệnh đầu: `npm test -- src/features/employee-management/components/employee-editor-errors.test.tsx`, kết quả 6 pass/5 fail. Có hai nguyên nhân khác nhau, không quy hết thành lỗi giao diện.

**Truy vấn label trong test.** Một số ca báo không tìm được label `Số điện thoại`/`Họ và tên`. `getByLabelText` đọc text DOM của label, gồm cả dấu sao; `aria-hidden` lại tác động tên truy cập. Kiểm markup cho thấy label/input đã liên kết đúng. Đổi sang `getByRole("textbox", { name: "Số điện thoại" })` để kiểm đúng tên mà công nghệ hỗ trợ sử dụng; không bỏ dấu sao hay nới validation để làm test xanh.

**Focus sau lỗi unlink.** Có ca expected activeElement là phần tổng hợp nhưng actual vẫn là tài khoản/nút cũ. Lịch focus trực tiếp từ handler có thể chạy khi React chưa gắn ref phần lỗi hoặc bị lịch trả focus sau đóng xác nhận ghi đè. Ca đơn lẻ từng qua, nên chạy lại không được coi là cách khắc phục. Đã chuyển lịch focus sang effect sau commit, chờ pending kết thúc/xác nhận đóng, hủy frame cũ và bỏ lịch trả focus tài khoản ở nhánh lỗi structured. Test kiểm focus tổng hợp, giữ tài khoản/bản nháp và hủy focus khi editor đóng đều qua.

**Thông báo mở thất bại bị giữ quá lâu.** Tự review thấy nếu lưu lại và vẫn nhận cùng ID trùng, state chỉ lưu ID sẽ làm câu “chưa mở được hồ sơ” xuất hiện ở lượt mới trước khi người dùng bấm. Đã gắn state này với chính phản hồi thay vì chỉ ID, thêm test hai lượt cùng ID. Thông báo cũ không còn bám sang lượt sau; không tự gọi lại thao tác mở. Test editor cuối đạt 13/13.

## Kiểm tra và tự review

- 3 test hàm binding: nhiều field/thứ tự, nhóm không có input, duplicate ID.
- 13 test component editor: multi-field/optional fields, ARIA, nhóm/version, duplicate, callback không mở được, phản hồi kế tiếp/cùng ID, phản hồi sau unmount, frame focus đã lên lịch và unlink bị từ chối.
- 2 test bổ sung ở cấp danh sách/editor: mở đúng ID sau cú bấm; ID chưa có vẫn giữ modal/bản nháp và không phát sinh lần load khác. Các test unlink có từ trước vẫn chạy.
- Nhóm 3 file binding/editor/unlink cuối: **33 pass**, trong đó **18 test mới**, 15 test unlink có từ trước.
- `npm test -- --reporter=dot`: **2.057 pass/31 Redis skip**, 170 file pass/4 file skip, 88,46 giây. Các test skip vẫn cần Redis opt-in, không được tính là đã kiểm runtime.
- `npm run lint`, `npm run typecheck`: exit 0 sau thay đổi cuối.
- `npm run build`: exit 0, 18/18 trang sinh thành công; không có employee API route mới.
- `git diff --check`: đạt. Bài học 109 và log kiểm tra vẫn nằm trong thư mục Git ignore. Backend clean tại `953f597`, HEAD Web giữ `b60e9e7`.

Tự review xác nhận UI không import API implementation; domain chỉ chứa kiểu dữ liệu. Không truyền chuỗi field tùy ý từ server vào `setError`, không coi Account ID là Employee ID, không đưa detail tiếng Anh vào UI, không thay quy tắc cấp quyền hoặc liên kết tài khoản. Khi bị từ chối lưu, callback thành công/toast không chạy; bản nháp và version không bị thay thế.

## Phần còn chờ

- MSG06: tiếp tục chờ metadata người sửa/thời gian theo quyết định đã chốt.
- MSG24 mới: chờ tên nhân viên structured; chưa parse detail, lấy tên bản nháp hay tự GET tên.
- Ngân hàng/vùng: đã hiển thị lỗi nhóm, chưa có form sửa nhóm đầy đủ. Các path lồng/index chưa được adapter chấp nhận vẫn là contract pending, không coi đã hỗ trợ.
- ID trùng chưa có trong workspace: hiện bảo toàn bản nháp; tích hợp GET detail có kiểm quyền thuộc bước API sau.
- Chưa nghiệm thu trên .NET/QA/Redis runtime hoặc browser native modal trong lượt này. Component test dùng jsdom với shim dialog, kiểm React state/ARIA/focus theo môi trường đó; không thay thế kiểm bàn phím/modal thực trên trình duyệt.
- Không phát hiện thêm lỗi chặn trong phạm vi đã kiểm. Không coi toàn UC10 hoặc luồng API nhân viên đã hoàn thành.
