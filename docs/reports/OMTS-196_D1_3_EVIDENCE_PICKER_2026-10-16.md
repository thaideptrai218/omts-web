# OMTS-196 — D1.3 Evidence image picker

## Hành vi

Evidence picker là controlled component: parent sở hữu `File[]`, còn picker xử lý file chooser, drag/drop, preview, remove, duplicate guard và lỗi của từng file. Validator được inject để MIME/size/count sau này dùng đúng backend contract thay vì bị hard-code trong component.

Ảnh preview dùng blob URL cục bộ và URL được revoke khi preview unmount. `next/image` được đặt `unoptimized` với kích thước 80 × 80 px: ảnh giấy tờ không đi qua Next image optimizer, nhưng layout vẫn ổn định và lint không phải tắt rule.

## Lỗi thực tế

Lint ban đầu báo `@next/next/no-img-element`; repo đặt `--max-warnings=0` nên một warning cũng làm lệnh thất bại. Sau khi đọc tài liệu Next.js 16 trong `node_modules`, preview chuyển từ `<img>` sang `next/image` với `unoptimized`. Typecheck, lint và diff check sau sửa đều đạt.
