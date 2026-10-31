# Dashboard hiện sớm và tổng hợp số liệu trước

Nghiên cứu ngày 27/10/2026 theo yêu cầu Duy Thái. Đây là đề xuất frontend/backend; chưa cài job, cache mới, stored procedure, Redis dashboard hoặc thay DB. API thật vẫn tắt.

## Thầy muốn “mở trang là có” có thể hiểu theo hai mức

**Mức một: trang phản hồi ngay.** Người dùng thấy tên trang, bố cục và lối tắt trước khi có số liệu. Chỉ ô số liệu chờ skeleton, lỗi tải không làm mất các lối tắt. Đợt polish đã làm mức này trong `DashboardExperience`; test giữ promise chưa resolve vẫn tìm được heading và lối tắt. Đây không phải bằng chứng backend nhanh lên hoặc số liệu đã có trước khi tải.

**Mức hai: con số có sẵn để đọc rất nhanh.** Backend cần một nguồn đọc đã được chuẩn bị/tối ưu. Frontend vẫn phải nhận response qua mạng, nhưng server không phải tính lại tất cả báo cáo trên từng lần mở. Không có cách hiển thị số mới chính xác mà không có dữ liệu từ nguồn hoặc bản sao đã được phép dùng.

## So sánh các cách

| Cách | Giải quyết việc gì | Hạn chế / điều kiện |
| --- | --- | --- |
| Khung trang + skeleton từng vùng | Cảm giác phản hồi và thao tác sớm | Không làm query nhanh hơn; không biến dữ liệu chưa có thành số 0 |
| Next loading/Suspense/streaming | Gửi phần giao diện sẵn trước phần đang chờ | Route/layout có auth vẫn phải kiểm trước khi trả dữ liệu bảo vệ; không di chuyển guard hoặc đổi SSR/caching trong đợt polish |
| Query tổng hợp gọn + index + projection | Giảm dữ liệu tải và số lần truy vấn | Cần đo query thật/execution plan; không tải toàn bộ employees/accounts chỉ để FE đếm khi dùng API thật |
| Stored procedure | Đóng gói các truy vấn/tính toán ở DB, có thể trả một snapshot | Tự đặt query vào procedure không bảo đảm hết chậm; nó vẫn có thể phải quét/join nhiều dữ liệu mỗi lần gọi |
| Bảng tổng hợp/read model | Đọc kết quả đã tính sẵn theo HTX/vùng | Phải có cơ chế cập nhật, kiểm độ mới và xử lý sai lệch; là đề xuất backend |
| Job định kỳ (cron/SQL Server Agent/background worker) | Tính trước và cập nhật bảng tổng hợp theo lịch | Số liệu có thể trễ tới lịch chạy kế tiếp; job lỗi có thể giữ số cũ rất lâu nếu không giám sát |
| Cập nhật theo sự kiện/giao dịch | Làm mới phần liên quan khi dữ liệu thay đổi | Phức tạp hơn; phải xử lý lặp sự kiện, sai thứ tự và rebuild |

Source backend local đang dùng EF Core SQL Server (`DependencyInjection.cs`, revision48ae1e0). Vì vậy không áp lệnh PostgreSQL materialized view vào OMTS. SQL Server có indexed view với điều kiện và chi phí riêng; không chọn chỉ vì tên nghe giống “tính sẵn”. Chưa xác nhận phiên bản/edition ở deployment nên không mặc định SQL Server Agent sẵn có.

## Hướng đề xuất cho nhóm backend

1. Đo endpoint/query dashboard thật trước. Với số tài khoản/nhân viên/vai trò, ưu tiên phép tổng hợp gọn, index và một DTO chỉ chứa số cần hiển thị. Đây thường là bước nhỏ hơn dựng một hệ thống job, nhưng chưa có benchmark OMTS thật để khẳng định đủ nhanh.
2. Thu chi và sản lượng theo kỳ có thể cần bảng tổng hợp theo HTX + vùng + kỳ. Khi nghiệp vụ đó sẵn sàng, BA/backend chọn cập nhật theo sự kiện, lịch hoặc kết hợp; mỗi lựa chọn có mức trễ khác nhau.
3. Endpoint đọc phải kiểm quyền server, chỉ trả metric người đó được phép xem. Khóa cache/bảng tổng hợp phải có tenant/zone và phạm vi phù hợp; tuyệt đối không chia một snapshot Owner cho mọi account. Dữ liệu tài chính và thông tin nhân sự không được public-cache để làm trang nhanh.
4. Snapshot nên có mốc dữ liệu và thời điểm tổng hợp do server cung cấp (tên trường cần nhóm thống nhất). FE có thể ghi “Dữ liệu đến …”; giờ FE nhận response không được giả làm thời điểm số liệu được tổng hợp.
5. Có giám sát lần tổng hợp thành công, lỗi job, thời gian chạy và khả năng rebuild. Refresh thủ công ở FE chỉ đọc lại snapshot; không tự kích hoạt job nặng hoặc lặp mutation khi mạng lỗi.

## Cần BA/backend chốt trước khi triển khai mức hai

- Mỗi metric được phép trễ bao lâu? Số tiền vừa ghi nhận có bắt buộc hiện ngay không?
- Vùng/HTX nào được gộp; ai được đọc từng chỉ số?
- Hạ tầng deploy có worker/job runner nào, ai vận hành và theo dõi khi job lỗi?
- Endpoint, schema, timestamp, invalidation và lỗi trả về là gì?

Các mục này chưa chốt nên frontend chưa tự thêm cron, SWR/cache hoặc phát số liệu cũ như số liệu hiện thời. Demo hiện vẫn là mock, phần thu chi/bè/sản lượng chưa có nguồn nên hiển thị trạng thái chưa có dữ liệu.

## Tài liệu đã đối chiếu

- [Next.js loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading) và tài liệu đi kèm Next16.4.3 trong node_modules: khung loading, streaming, shared layouts và giới hạn khi layout truy cập runtime data.
- [Microsoft EF Core — Efficient Querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying): index, chỉ chọn cột cần thiết và đo truy vấn.
- [Microsoft — Materialized View pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view): read model, cập nhật theo sự kiện/lịch, stale data và giám sát độ mới.
- [Microsoft — Create Indexed Views](https://learn.microsoft.com/en-us/sql/relational-databases/views/create-indexed-views?view=sql-server-ver17): điều kiện và chi phí duy trì indexed view; cần kiểm edition/version thật.
- [Microsoft — SQL Server Agent](https://learn.microsoft.com/en-us/ssms/agent/sql-server-agent?view=sql-server-ver16): lịch chạy job; không phải một phương pháp bỏ qua request API.
