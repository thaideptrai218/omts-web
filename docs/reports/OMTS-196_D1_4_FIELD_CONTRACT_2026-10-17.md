# OMTS-196 — D1.4 Field contract

## Nguồn và cách chốt phạm vi

SCR-56 định nghĩa ba nhóm dữ liệu bắt buộc: tên HTX và mã sơ bộ; danh tính/liên hệ của Owner đầu tiên; căn cứ xác minh. Jira `OMTS-196` rút gọn scope thành tên HTX, Owner contact và evidence image, nhưng không tuyên bố loại bỏ mã sơ bộ. Vì vậy form giữ `preliminaryCode` theo SRS và ghi rõ đây chưa phải tên field của QA API.

SRS mô tả identity/contact là một text field, không đưa ra danh sách con. Frontend giữ nguyên một `ownerIdentityContact` dạng textarea, tránh tự biến họ tên, giấy tờ, điện thoại hoặc email thành các field/validation bắt buộc chưa được nhóm phê duyệt.

Evidence bắt buộc có ít nhất một ảnh. Frontend chỉ kiểm tra MIME bắt đầu bằng `image/`; không đặt giới hạn dung lượng hoặc số lượng khi backend chưa có contract.

## Kết luận

Field contract đủ để dựng UI mock và có thể đổi tại adapter/schema khi backend chốt. D1.8 vẫn phải xác nhận payload `preliminaryCode`, cấu trúc Owner contact và file policy trước khi nối QA API.
