# Rà soát thuật ngữ và tên màn hình tiếng Việt

Ngày: 04/11/2026
Tài liệu đối chiếu: `D:\Đồ_án\Report3_v8.md` (Report 3, cập nhật 28/10/2026)
Phạm vi: nội dung hiển thị trên Web; giữ nguyên API, route, quyền, trạng thái và quy tắc nghiệp vụ.

## Cách gọi sản phẩm

Report 3 định nghĩa OMTS là *Oyster Management and Traceability System* và nêu sản phẩm hỗ trợ Hợp tác xã Nuôi trồng Thủy sản Trung Nam quản lý nuôi hàu, mua bán và truy xuất nguồn gốc. Đây là mã/tên kỹ thuật trong tài liệu dự án; không phải tên người dùng cần biết.

- Tên tổ chức hiển thị đầy đủ khi cần: **Hợp tác xã Nuôi trồng Thủy sản Trung Nam**.
- Tên ngắn trên thanh điều hướng: **HTX Trung Nam**.
- Mô tả sản phẩm: **Quản lý nuôi hàu · Truy xuất nguồn gốc**.
- Tránh hiển thị “OMTS” như tên sản phẩm trong giao diện người dùng. Giữ nguyên `OMTS` trong biến môi trường, header bảo mật, mã kỹ thuật, tên repo, tài liệu và log.

## Bảng thuật ngữ giao diện

| Khái niệm/code nội bộ | Cách gọi trên giao diện |
| --- | --- |
| Cooperative Owner | Chủ nhiệm HTX |
| Staff (chung) | Nhân viên HTX |
| Staff có quyền quản lý vùng | Quản lý vùng |
| Staff có quyền kế toán | Kế toán |
| Trader | Thương lái |
| Employee | Người lao động |
| System Administrator | Quản trị hệ thống |
| Public Viewer | Người tra cứu nguồn gốc |
| Dashboard | Tổng quan HTX / Bảng điều hành, tùy ngữ cảnh |
| Username | Tên đăng nhập |
| Push | Thông báo đẩy |
| Water measurements | Theo dõi chất lượng nước |
| Sales products | Danh mục sản phẩm hàu |
| Purchase requests | Yêu cầu mua hàu |
| Purchase receipts | Phiếu nhập vật tư |
| Workforce | Phân công và chấm công |
| My work | Công việc và nghỉ phép |

Vai trò Quản lý vùng/Kế toán của tài khoản Staff được suy ra từ danh sách quyền hiện có ở giao diện. Không tạo thêm actor hoặc thay đổi quyền backend.

## Luồng nghiệp vụ và screenflow trong Report 3

Report 3 mô tả luồng tổng thể BF-00 và các luồng mua vật tư, chu kỳ nuôi/thả giống, theo dõi vùng nuôi, thu hoạch/yêu cầu mua, giao dịch tại cảng, công nợ, khiếu nại/truy xuất, nhân lực và tiền lương (BF-01 đến BF-06.2). Screenflow chia thành tám sơ đồ theo actor/app:

- SF-01: trang công khai, tài khoản và thương lái.
- SF-02: ứng dụng người lao động.
- SF-03–04: Quản lý vùng, từ mua vật tư/nuôi trồng/nước/thu hoạch đến bán hàng/truy xuất/nhân lực.
- SF-05: Kế toán.
- SF-06–08: Chủ nhiệm HTX, gồm tổng quan/quyết định, thiết lập/phân quyền và danh mục/cấu hình.

Web đã đổi cách gọi các màn đang có API hoặc chức năng local sang thuật ngữ phù hợp người dùng: tổng quan HTX; phiếu nhập vật tư; thanh toán nhà cung cấp; theo dõi chất lượng nước; yêu cầu mua hàu; danh mục sản phẩm hàu; phân công và chấm công; công việc và nghỉ phép. Màn đăng nhập, hồ sơ, điều hướng, vai trò, thông báo và thông điệp lỗi cũng dùng tên HTX và cách gọi actor tiếng Việt.

Report 3 mô tả phạm vi nghiệp vụ đầy đủ hơn những API Web hiện có. Việc Việt hóa không tạo màn giả cho các khâu chưa có API/luồng thực thi đầy đủ. Theo rà soát hiện tại, chuỗi thu hoạch tại bè → cân/giao ở cảng → hóa đơn bán → thu tiền/công nợ → công bố truy xuất còn phụ thuộc các API backend; luồng staffing của yêu cầu mua hàu đã có quyết định Web riêng ngày 04/11. Người dùng/tester cần phân biệt màn đã nối API với các bước đang chờ contract/backend.

## Các thay đổi đã thực hiện

- Đổi metadata, thương hiệu, nội dung đăng nhập và mô tả hệ thống sang Hợp tác xã Nuôi trồng Thủy sản Trung Nam/HTX Trung Nam, quản lý nuôi hàu và truy xuất nguồn gốc.
- Thống nhất nhãn actor ở shell API, hồ sơ cá nhân và tài khoản mock; các tên vai trò tiếng Anh chuẩn trong danh sách quyền API được chuyển sang nhãn tiếng Việt ở lớp trình bày, giữ nguyên phân quyền và định danh code.
- Việt hóa tên các màn nghiệp vụ hiện hữu và nhãn kênh thông báo.
- Làm sạch thông điệp người dùng khỏi OMTS và các thuật ngữ “username”, “Dashboard”, “Chủ HTX” ở các vị trí được rà soát.
- Cập nhật kỳ vọng văn bản của kiểm tra message catalog cho copy mới.

## Kiểm chứng và giới hạn

- Đã đọc trang đăng nhập local trên trình duyệt: tên HTX đầy đủ, mục đích quản lý nuôi hàu/truy xuất, nhãn đăng nhập và trợ giúp đều hiển thị tiếng Việt.
- Kết quả kiểm tra source: `npm run lint`, `npm run typecheck`, `npm run build` và `git diff --check` đều đạt.
- Không chạy bộ kiểm thử Vitest trong lượt này; phần thay đổi hiện tại là copy, test message catalog đã được cập nhật kỳ vọng theo nội dung mới.
- Không đổi endpoint, payload, schema, quyền, route, validation hoặc chuyển trạng thái.
- Một số từ quốc tế đã thành thuật ngữ phổ thông/định dạng dữ liệu như Email, SMS, Zalo OA, QR, PDF, pH, cũng như username/code dùng trong dữ liệu tài khoản có thể vẫn xuất hiện khi chính giá trị đó cần được nhận diện. Các từ này không phải tên role hay tên sản phẩm.
- Báo cáo tập trung vào chuỗi giao diện được rà soát trong thay đổi hiện tại; chưa phải bản hiệu đính toàn văn 62 screen của Report 3 và không khẳng định mọi dữ liệu nhập từ backend/mock đều đã sạch thuật ngữ.
