/** Nội dung tĩnh của trang giới thiệu OMTS (tiếng Việt). Không chứa số liệu thật: chỉ mô tả chức năng của hệ thống. */

export const navLinks = [
  { href: "#quy-trinh", label: "Quy trình" },
  { href: "#truy-xuat", label: "Truy xuất" },
  { href: "#vai-tro", label: "Vai trò" },
  { href: "#tinh-nang", label: "Tính năng" },
] as const;

export type FlowStep = { step: string; title: string; text: string; icon: "raft" | "harvest" | "sale" | "qr" };
export const flowSteps: readonly FlowStep[] = [
  { step: "01", title: "Nuôi trồng", icon: "raft", text: "Quản lý vùng, bè, làn nuôi; ghi đợt thả giống, vật tư đã dùng, nhật ký ảnh và chất lượng nước theo ngày." },
  { step: "02", title: "Thu hoạch", icon: "harvest", text: "Tạo lô thu hoạch theo bè, cân kg, chụp ảnh và đóng lô khi đã bán hết. Mỗi lô có mã riêng, không trùng." },
  { step: "03", title: "Bán hàng", icon: "sale", text: "Lập hóa đơn từ các lô, nhận tiền mặt hoặc VietQR, ghi nợ có kiểm soát và gửi hóa đơn cho khách." },
  { step: "04", title: "Truy xuất", icon: "qr", text: "Hóa đơn có mã QR dẫn tới trang nguồn gốc công khai: vùng nuôi, ngày thả giống, nhật ký và ngày thu hoạch." },
];

export type RoleCard = { role: string; text: string; points: readonly string[] };
export const roles: readonly RoleCard[] = [
  { role: "Chủ hợp tác xã", text: "Nắm toàn cảnh và quyết định các việc quan trọng.", points: ["Bảng điều khiển và việc chờ xử lý", "Phân quyền theo vùng và chức năng", "Duyệt giá, nợ và yêu cầu của thương lái"] },
  { role: "Quản lý vùng nuôi", text: "Điều hành vùng được giao từ bè đến hóa đơn.", points: ["Chu kỳ nuôi, thả giống, thu hoạch", "Lập hóa đơn bán và phiếu nhập hàng", "Phân công và chấm công nhân viên"] },
  { role: "Kế toán", text: "Theo dõi tiền vào, tiền ra và đối chiếu công nợ.", points: ["Công nợ nhà cung cấp và khách hàng", "Bảng lương, thanh toán lương", "Báo cáo hiệu quả bán hàng, xuất Excel"] },
  { role: "Nhân viên thời vụ", text: "Xem việc được giao, vào ca và ra ca.", points: ["Công việc và ca làm của tôi", "Phản hồi lời mời đi mua hàng", "Gửi đơn xin nghỉ"] },
  { role: "Thương lái", text: "Gửi yêu cầu mua và theo dõi thanh toán.", points: ["Yêu cầu mua theo ngày lấy hàng", "Hóa đơn, công nợ và sao kê", "Mã QR kiểm tra nguồn gốc"] },
  { role: "Người mua hàng", text: "Quét mã QR trên hóa đơn, không cần tài khoản.", points: ["Xem vùng nuôi và ngày thu hoạch", "Xem nhật ký nuôi đã công bố", "Biết lô còn hiệu lực hay đã thu hồi"] },
];

export type Feature = { title: string; text: string; size?: "wide" };
export const features: readonly Feature[] = [
  { title: "Dữ liệu một nguồn, nhiều vùng", text: "Mỗi nhân viên chỉ thấy và thao tác đúng vùng mình được giao; quyền kiểm tra ở cả giao diện lẫn máy chủ.", size: "wide" },
  { title: "Không bán trùng, không mất dấu", text: "Mỗi hóa đơn gắn với từng lô thu hoạch; trả hàng và sửa dữ liệu đều để lại lịch sử." },
  { title: "Công nợ rõ ràng", text: "Sao kê theo khách hàng và nhà cung cấp, xác nhận thanh toán, hoàn tiền thừa, xuất Excel." },
  { title: "Dùng được ngoài bến", text: "Giao diện co giãn từ điện thoại đến máy tính, chữ lớn, nút bấm đủ rộng cho tay ướt." },
  { title: "Thông báo đúng việc", text: "Yêu cầu mua, lời mời ca làm, thanh toán chờ xác nhận được đưa lên hộp thư ngay khi phát sinh.", size: "wide" },
];

export const sampleTrace = {
  lot: "B03-20261026",
  zone: "Vùng VP01 · Vân Đồn, Quảng Ninh",
  rows: [
    ["Thả giống", "Ngày thả và nguồn giống được ghi lại"],
    ["Nhật ký nuôi", "Có ảnh theo từng đợt kiểm tra"],
    ["Chất lượng nước", "Đo và đối chiếu ngưỡng theo ngày"],
    ["Thu hoạch", "Cân tại bè, ghi người phụ trách"],
  ],
} as const;

/**
 * Ảnh thực tế của HTX Trung Nam (để trống cho tới khi có ảnh thuộc quyền sử dụng của nhóm).
 * Cách thêm: chép ảnh vào `public/landing/` (JPG/WebP, cạnh dài 1600–2000 px), rồi thêm một mục như
 * { src: "/landing/be-hau-binh-minh.jpg", alt: "Mô tả ảnh cho người dùng đọc màn hình", caption: "Chú thích ngắn" }.
 * Ảnh đầu tiên được hiển thị lớn nhất. Khi mảng có ảnh, mục "Hình ảnh thực tế" tự xuất hiện trên trang.
 * Chỉ dùng ảnh do nhóm hoặc HTX tự chụp, hoặc ảnh có giấy phép cho phép dùng lại.
 */
export type LandingPhoto = { src: string; alt: string; caption: string };
export const landingPhotos: readonly LandingPhoto[] = [];
