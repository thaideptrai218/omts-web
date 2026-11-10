# Backend và màn Web — kiểm tra 10/11/2026

Đã fetch/prune origin toàn bộ remote branches của omts-backend và đọc PR đang mở qua gh. origin/develop = 34e686b1; fetch không cập nhật container/database. Không merge hoặc sửa backend.

## Thay đổi so với báo cáo 09/11 dùng mốc 629e481d

- cab72fa3 / #65: rút công bố nguồn gốc, thông báo thương lái.
- ae6075bb / #71: danh sách hóa đơn, lọc/tìm kiếm, export và print.
- 2212d8a2 / #69: trang nguồn gốc công khai Việt/Anh.
- 34e686b1 / #70: giao dịch VietQR chờ thanh toán, thông báo nhận tiền, đổi phương thức/dừng giao dịch.

Các nhóm này đã có code Web tại lot-tracing, sales-invoice-list, origin-page và sales-invoices. Không còn đúng khi gọi chúng là màn chưa làm. Chưa kiểm tra runtime trong lượt audit này.

## Nhánh chưa merge

- PR72 / feature/OMTS-224-correct-cancel: sửa/hủy hóa đơn. Web đã có BFF và dialog, cần backend chứa nhánh tương ứng.
- PR73 / feature/OMTS-225-claim-submit-respond: thương lái gửi khiếu nại kèm ảnh, Owner phản hồi. Web đã có màn, cần backend chứa nhánh tương ứng.
- chore/cors-zalo-mini-app: workforce/nghỉ phép, yêu cầu mua theo lồng, mời nhân viên và duyệt kế hoạch ngày. Web có workforce/my-work và luồng staffing cũ; chưa khẳng định có màn duyệt kế hoạch ngày hoàn chỉnh. Develop vẫn là yêu cầu mua kg/phản hồi trực tiếp, khác quyết định giữ lồng trước đó.
- feature/OMTS-212-lab có PayrollsController và AttendanceController lịch sử. Không được kết luận toàn bộ repository không có code bảng lương; chưa đủ bằng chứng contract cũ phù hợp luồng bảng lương hiện tại để nối trực tiếp.

## Phần Web thực sự còn thiếu hoặc chưa nối

1. Phiếu trả hàng bán: sales-returns vẫn FRAME ONLY. Chưa thấy controller trả hàng bán trong các remote origin branches đã liệt kê.
2. Bảng lương và thanh toán lương: payroll vẫn khung; develop chưa có controller. Cần đối chiếu nhánh lab cũ với nghiệp vụ hiện hành, không coi là API sẵn sàng.
3. Ba báo cáo: hiệu quả bán hàng, xu hướng giá, vấn đề sau bán: sales-reports vẫn khung, chưa thấy controller tương ứng trong các nhánh origin.
4. Tổng quan báo cáo Owner: chưa có API tổng hợp đủ dữ liệu để thay toàn bộ phần mẫu.
5. Hóa đơn của chính thương lái trong Đơn mua của tôi: chưa nối; MePurchasesController develop chỉ có yêu cầu mua, chưa có GET me/sales-invoices.
6. Duyệt kế hoạch ngày trên nhánh Zalo: cần màn/đối chiếu contract riêng, chưa coi workforce hiện có bao phủ endpoint này.
7. Số lồng thực tế trên báo cáo và lô có thể bán: còn thiếu dữ liệu API theo từng lô; Web chỉ quy đổi có nhãn xấp xỉ. Xem yêu cầu API mục D trong BACKEND_API_REQUESTS_FROM_WEB_2026-11-09.md.

Các màn đã có source tích hợp: thanh toán khách, công nợ, sản lượng, truy xuất/công bố, trang nguồn gốc, danh sách/in/xuất hóa đơn và VietQR. Đây là kết luận source, không phải xác nhận mọi luồng live đã chạy thành công.

Câu hỏi cần chốt khi triển khai: contract bảng lương nhánh lab còn được dùng không; duyệt kế hoạch ngày có thuộc Web theo nghiệp vụ nhóm hiện tại không. Không tự đổi quyết định yêu cầu mua theo lồng.
