# Tham khảo nhân sự KiotViet — 10/11/2026

Nguồn: https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-nhan-vien/ và 21 ảnh người dùng cung cấp.

## Áp dụng đợt đầu

- Danh sách nhân viên API: bấm dòng mở thông tin ngay dưới dòng; bấm lại để thu gọn. Nút truy cập bàn phím có aria-expanded và aria-controls.
- Hiện tên, tình trạng làm việc, liên hệ, vùng làm việc, tài khoản liên kết và tình trạng tài khoản từ dữ liệu danh sách hiện có.
- Nút Cập nhật hồ sơ tiếp tục mở editor hiện hữu, tải bản ghi qua API. Không đổi quyền, validation hoặc lệnh ghi.
- Giữ tìm kiếm trên bảng, bộ lọc bên trái và phân trang server. Màn mock chưa áp dụng đợt này.

## Đợt tiếp: lịch và chấm công trong ngày

Đọc tiếp https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-nhan-vien/quan-ly-cham-cong/ phần đặt lịch, xem theo nhân viên/ca và chi tiết chấm công.

- Thêm nút ngày trước/ngày sau/Hôm nay, vẫn truy vấn API theo một ngày và đặt lại trang khi đổi ngày.
- Bấm dòng phân công hoặc nút Xem chi tiết để mở ngay bên dưới: nhân viên, ngày, vùng, bè, công việc, giờ vào và ra, trạng thái hiện có.
- Không thay đổi các điều kiện quyền và xác nhận vào/ra/gỡ. Không bổ sung giờ theo ca, phép tính muộn/sớm, lịch lặp hay duyệt chỉnh công từ quy tắc KiotViet.
- Chỉ áp dụng màn API /operations/workforce; chưa có ma trận tuần/tháng.
- Lint, typecheck và build 65 trang đạt sau thay đổi. Chưa xác minh giao diện trong browser hoặc ghi chấm công thật.

## Các phần tiếp theo cần đối chiếu

1. Chia editor hiện tại thành nhóm thông tin cá nhân/công việc/ngân hàng/tài khoản; giữ toàn bộ trường và điều kiện hiện hành.
2. Chấm công: tách cách đọc lịch phân công và giờ vào/ra thực tế; trình bày trạng thái có chú giải. Chỉ tổng hợp dữ liệu đã tải đủ và đúng phạm vi quyền; không coi trang chưa tải là nghỉ làm.
3. Lịch tuần/tháng: cần kiểm tra API khoảng ngày và phân trang trước khi dựng ma trận nhân viên × ngày. API theo một ngày không được biến thành bảng tháng có dấu chấm giả.
4. Nghỉ phép: gom yêu cầu và kết quả đã có; chỉ đưa thao tác duyệt được backend cho phép.

## Chờ đối chiếu nghiệp vụ và backend

- BHXH, thuế TNCN, phòng ban/chức danh mới, hoa hồng, tạm ứng, thiết bị và duyệt chỉnh công: ảnh KiotViet không phải yêu cầu nghiệp vụ OMTS đã chốt.
- Import Excel cần API nhập hàng loạt và quy tắc xử lý lỗi; không tự POST từng người hoặc thêm giới hạn 500 từ KiotViet.
- Payroll có mã trong nhánh lab cũ; cần đối chiếu contract hiện hành, không coi là API develop đang sẵn sàng.

## Kiểm tra

- ESLint tệp thay đổi và typecheck đạt.
- Lint toàn repo và production build 65 trang đạt. Đã khởi động lại Web API 3002 bằng build mới.
- Chưa kiểm tra browser hoặc ghi CRUD trong đợt này.

## Câu hỏi còn mở

Phạm vi BHXH/thuế/tạm ứng có thuộc SRS hiện hành hay chỉ tham khảo cách trình bày? Chưa thêm các nghiệp vụ này.

## Đợt 2 — danh sách, hồ sơ và cấp tài khoản

- Màn Nhân viên API giữ Owner-only. Chi tiết mở dưới dòng, tải GET khi mở lần đầu, có skeleton/lỗi/thử lại và cache hồ sơ không chứa mật khẩu trong vòng đời trang; làm mới sau thao tác lưu/đổi trạng thái/cấp tài khoản. Bốn tab: Thông tin, Công việc (kèm lịch sử loại nhân viên), Ngân hàng, Tài khoản đăng nhập. Thiếu quyền duy trì được thông báo rõ ở dữ liệu cá nhân/ngân hàng. Cập nhật hồ sơ và nghỉ việc/làm lại giữ luồng xác nhận hiện có.
- Editor thêm/sửa dùng cùng bốn nhóm, giữ mọi trường, quy tắc validation, đối chiếu xung đột và một nút Lưu hồ sơ. Chuyển tab giữ nháp; tab có lỗi hiện chữ “Có lỗi”, mở đúng nhóm và focus trường lỗi đầu tiên khi lưu thất bại. Tab hỗ trợ phím mũi tên/Home/End; dòng mở bằng Enter/Space và có aria-expanded/aria-controls.
- Nhân viên đang làm việc chưa có tài khoản được cấp qua BFF action `issue-account`: chỉ gửi username và email tùy chọn tới `POST /api/employees/{id}/account`, không gửi grants/subjectType. BFF kiểm Owner, CSRF và schema request/response; trả `Cache-Control: no-store`. Theo yêu cầu người dùng ngày 10/11/2026, Owner nhận mật khẩu tạm đúng một lần, thay thế mô tả lịch sử không bàn giao mật khẩu cho Owner. Hộp thoại có sao chép, thời hạn và cảnh báo không hiện lại; đóng là xóa khỏi state, không đưa vào cache hồ sơ, URL, lưu trữ trình duyệt hay nhật ký.
- Bảng giữ tìm kiếm/bộ lọc/phân trang; số điện thoại không ngắt dòng, loại nhân viên có chip, trạng thái có pill, giá trị dài rút gọn kèm title. CSS hỗ trợ bảng/card để tránh tràn ngang trang trên màn nhỏ.
- Kiểm thử xác minh tải chi tiết lười/cache/thử lại/quyền/tab/bàn phím; editor giữ giá trị, hiện lỗi đúng tab, giữ validation/xung đột; cấp tài khoản và bàn giao mật khẩu một lần, xóa sau đóng, ánh xạ lỗi; BFF schema/Owner/CSRF/no-store và không lộ mật khẩu qua các thao tác khác. Lệnh Vitest đúng phạm vi yêu cầu: 922 đạt / 16 lỗi, 64 tệp đạt / 6 tệp lỗi (938 tests, 70 tệp). Không có lỗi trong employee-api hoặc server/employees. 16 lỗi thuộc backend hiện hữu (15: endpoint/transport/diagnostic/serialization/server-auth-tokens) và employee-account-creation mock hiện hữu (1); không sửa hay giảm assertion. ESLint toàn src đạt; `npx.cmd tsc --noEmit -p .` toàn dự án đạt, không lỗi. 41 kiểm thử mới gồm 18 BFF, 12 cấp tài khoản, 5 chi tiết, 4 editor, 2 vòng đời danh sách; các kiểm thử editor cũ tiếp tục đạt.
- OMTS không có tab Lương/BHXH/thuế, phòng ban/chức danh. Import/export Excel thuộc bước sau; không thêm tab vô hiệu hóa hoặc trường không có trong contract. Chưa xác minh browser ở 360 px/1024 px hoặc cấp tài khoản thật trên backend trong đợt này; không chạy production build theo yêu cầu để giữ dev server 3002.

## Đợt 3 — nối API mới: lọc, sắp xếp, mã nhân viên, xuất/nhập file

Đã nối vào backend nhánh feature/web-hr-api-gaps (giai đoạn 1). Màn vẫn chỉ dành cho Owner.

- Danh sách: cột lọc có thêm nhóm phân loại **Loại nhân viên** (Thời vụ / Nhân viên, đứng đầu) và chọn **Loại công việc**; tìm theo mã, tên hoặc số điện thoại. Mọi bộ lọc chạy phía server. Tiêu đề cột bấm được để sắp xếp tăng/giảm trên toàn bộ dữ liệu (tên, mã, số điện thoại, loại, tình trạng, ngày làm cuối); chưa chọn cột thì giữ thứ tự mặc định của backend. Cột **Mã nhân viên** mặc định hiện, đứng đầu sau mũi tên, ẩn được trong bảng chọn trường. Ô chọn từng dòng và chọn cả trang; thanh thao tác hiện số dòng đã chọn với **Xuất file** chỉ cho các dòng đó (tối đa 200, trang tối đa 50 dòng). Chọn lại từ đầu khi đổi bộ lọc, tìm kiếm, sắp xếp hoặc trang.
- **Xuất file**: tải .xlsx theo bộ lọc và thứ tự hiện tại (không phân trang), tên file lấy từ backend; vượt 5.000 nhân viên thì báo cần thu hẹp bộ lọc. **Import file** (pop-up như Nhà cung cấp): tải file mẫu, chọn .xlsx tối đa 2 MB, xem kết quả “Đã nhập N nhân viên” và bảng Dòng / Trường / Thông báo của các dòng bị bỏ qua (dòng lỗi bị bỏ, dòng đúng vẫn được nhập). Sau khi nhập có kết quả chưa rõ thì khóa nhập lại cho tới khi tải lại danh sách.
- Hồ sơ và form thêm: thêm mã nhân viên (để trống thì hệ thống sinh NV000001…; mã trùng báo MSG-GEN-02 ngay tại ô), giới tính, ngày bắt đầu làm việc (không ở tương lai), CCCD (9 hoặc 12 số, chỉ khi có quyền sửa). Sửa tại chỗ trong tab Thông tin; giới tính và ngày bắt đầu không có thao tác xóa, CCCD xóa bằng chuỗi rỗng. Theo quyết định mới của chủ sản phẩm, **không có email** ở nhân viên, form thêm hay cấp tài khoản; đăng nhập bằng tên đăng nhập hoặc số điện thoại.
- Loại công việc: tiêu đề cột (tên, đơn giá hiện tại, hiệu lực từ, trạng thái) bấm để sắp xếp phía server.
- BFF `/api/operations/employees`: thêm tham số danh sách `employeeType`, `jobTypeId`, `sortBy`, `sortDir`; GET `action=export` (lọc/sắp xếp hoặc `ids` lặp tối đa 200), GET `action=import-template`, POST multipart `action=import`. Chỉ Owner, kiểm lại phiên sau khi backend trả lời, `Cache-Control: no-store`, nhập file kiểm CSRF trước khi đọc thân, giới hạn 2 MB, chỉ .xlsx, đúng một phần `file`, kết quả kiểm schema nghiêm ngặt; không ghi nội dung hay tên file.
- Vẫn nằm ngoài phạm vi: tab lương/BHXH/thuế, phòng ban/chức danh. Chưa kiểm tra bằng trình duyệt (bố cục 360 px/1024 px, tải file thật) trong đợt này.
