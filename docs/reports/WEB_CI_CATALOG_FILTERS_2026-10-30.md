# CI PR3 và bộ lọc danh mục — 30/10/2026

## CI đã kiểm

Head `413c1d1ad329aafa14cfdfa8979987507908429c`, [CI40983939153](https://github.com/thaideptrai218/omts-web/actions/runs/40983939153) SUCCESS. Checkout/install/lint/typecheck/test/build/test-session-pages đều thành công.252 test files passed/7 skipped;2803 tests passed/48 skipped theo cấu hình CI hiện có (không có Redis integration service), build41routes,61 built-product assertions PASS. Không thay workflow hoặc bỏ test để né lỗi. Gitleaks và PR title cũng SUCCESS.

GitGuardian check123830344828 FAILURE:11positions trong52commits. Các commit được chỉ đến:7316e55,56ba7f4,79066ed,c2415cc,ddb2b21,d74934f,661abe9,77cbd0f. Không có finding chỉ vào commit sau77cbd0f trong output này; inbox/Trader approval hiện tại không thêm finding mới. Không in raw secret/snippet ra báo cáo. Lịch sử GG đã được người dùng để xử lý sau; không rewrite history, bypass scanner hoặc tự đánh mọi finding là false-positive. Vì vậy không tuyên bố toàn PR xanh. Output và log đầy đủ được giữ ignored tại docs/learning.

## Chức năng nối thêm

Backend có sẵn GET suppliers với `type=Seed|Material|Other` và GET farming-input-items với `group=Seed|RaftMaterial|Other`; Web trước đó chỉ có search/status. Thêm dropdown tương ứng, dùng chung catalog với form để giữ enum chính xác. Thay category đưa page về1; xóa category giữ search/status. BFF chỉ cho đúng query của resource, từ chối giá trị không hợp lệ/duplicate/detail query với category. Supplier lọc/phân trang ở upstream; input endpoint trả full filtered array rồi BFF phân trang. Không lọc riêng20 dòng đang hiển thị.

10 test mới cộng11 hồi quy liên quan =21 PASS, bao gồm kết hợp filter/search/status/page reset, clear category, upstream URL và input array paging, forged resource/enum/query, account-follow-up và projection/permissions cũ. Lint/typecheck/build41/41 và61 built-product assertions PASS. HTTP thật3002/8080:3supplier types và3input groups phân chia đúng baseline; kết hợp active status không lẫn nhóm; Manager đọc được, Trader403; duplicate/invalid400. Chỉ đọc nghiệp vụ, mọi phiên HTTP QA đã logout. Chưa có browser/viewport evidence mới cho dropdown; component tests không được gọi là browser E2E.

## Phần còn phụ thuộc

Fetch origin backend không có SHA mới: develop953f597, Zalo branchdc00b2f, LABc92787b. Inbox/Trader approval đã nối ở QA3003/8081. LAB cũ có endpoints nhưng chưa tương thích thiết kế hiện hành; chu kỳ/thu hoạch/sales/finance/QR vẫn thiếu API phù hợp. Các quyết định chờ backend về Staff email OR phone, create/reset secret-free, fixed roles/grants, ngân hàng HTX, license Manager và certificate deleteatomic vẫn áp dụng. Không thêm mock vào API mode, không merge nhánh backend/Web, không đóng Jira.
