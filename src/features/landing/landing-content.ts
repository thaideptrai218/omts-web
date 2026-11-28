/** Nội dung tĩnh của trang giới thiệu (tiếng Việt) và ảnh mặc định khi chủ hợp tác xã chưa đăng ảnh của mình. */
import { samplePhotos } from "@/features/origin-page/origin-sample";
import type { JourneyStep } from "@/features/public-site/journey-line";

export const navLinks = [
  { href: "#san-pham", label: "Sản phẩm" },
  { href: "#con-giong", label: "Con giống" },
  { href: "#xem-mau", label: "Truy xuất" },
  { href: "#hanh-trinh", label: "Hành trình" },
  { href: "#chung-nhan", label: "Chứng nhận" },
  { href: "#bao-chi", label: "Báo chí" },
] as const;

export type LandingImage = { url: string; caption: string };

/**
 * Ảnh mặc định, đều từ Wikimedia Commons (nguồn ở /landing/nguon-anh.txt); chủ hợp tác xã đăng ảnh ở Cài đặt,
 * Trang giới thiệu thì thay thế. Không in nguồn trên ảnh; tác giả và giấy phép nằm ở liên kết "Nguồn ảnh"
 * cuối trang (giấy phép CC BY bắt buộc, đừng bỏ liên kết). Ảnh báo chí mặc định là ảnh chụp bản tin VTV1.
 */
export const defaultImages = {
  background: "/landing/mau/nen-lang-be.webp",
  press: [{ url: "/landing/mau/ban-tin-vtv1.webp", caption: "Bản tin Thời sự VTV1 tại Quảng Ninh. Nguồn: VTV1" }] as LandingImage[],
  gallery: [
    { url: samplePhotos.floats, caption: "Khu nuôi hàu bè" },
    { url: samplePhotos.harvest, caption: "Hàu sau thu hoạch" },
    { url: samplePhotos.ropes, caption: "Giàn bè trên vịnh" },
    { url: "/landing/mau/vinh-bai-tu-long.webp", caption: "Vịnh Bái Tử Long" },
  ] as LandingImage[],
  product: samplePhotos.harvest,
};

export const journey: readonly JourneyStep[] = [
  { key: "uom", icon: "nursery", badge: "Ngày 1", title: "Ươm giống", detail: "Ghi lô giống, nguồn gốc và người phụ trách." },
  { key: "tha", icon: "seeding", badge: "Ngày 31", title: "Thả giống", detail: "Ghi ngày thả, loại giống, bè và làn nuôi." },
  { key: "cham", icon: "care", badge: "Ngày 32 đến 244", title: "Chăm sóc", detail: "Ghi nhật ký, ảnh, vật tư và chất lượng nước." },
  { key: "thu", icon: "harvest", badge: "Ngày 245", title: "Thu hoạch", detail: "Cân tại bè, mỗi lô có một mã riêng." },
  { key: "ban", icon: "sale", badge: "Ngày 246", title: "Bán hàng", detail: "Hóa đơn có mã QR dẫn về đúng lô đã bán." },
];

/** Đúng những gì trang truy xuất công khai hiển thị; sửa trang đó thì sửa cả danh sách này. */
export const shownOnTrace = [
  "Tên sản phẩm, giới thiệu sản phẩm và mã lô",
  "Vùng nuôi, bè và vị trí trên bản đồ",
  "Ngày thả giống, loại giống, ngày thu hoạch và số ngày nuôi",
  "Tên nhà cung cấp con giống",
  "Ảnh thu hoạch và ảnh bè nuôi",
  "Thông tin hợp tác xã và các chứng nhận",
] as const;

export const hiddenOnTrace = ["Giá bán", "Số lượng", "Thông tin người mua"] as const;

export const scanSteps = [
  { title: "Tìm mã trên hóa đơn", text: "Mã QR nằm trên hóa đơn hoặc trong tin nhắn hợp tác xã gửi." },
  { title: "Mở máy ảnh điện thoại", text: "Hướng máy ảnh vào mã. Không phải cài thêm ứng dụng." },
  { title: "Xem nguồn gốc", text: "Trang mở ngay, không cần tài khoản hay đăng nhập." },
] as const;

/** Lô minh họa trên thẻ đầu trang, dùng khi chưa chọn hóa đơn mẫu. */
export const sampleTrace = {
  product: "Hàu Thái Bình Dương",
  description: "Hàu sữa nuôi tại Vân Đồn, Quảng Ninh.",
  photo: "/landing/mau/ro-hau.webp",
  lot: "B03-20261026",
  facts: [["Thả giống", "26/03/2026"], ["Thu hoạch", "26/10/2026"], ["Số ngày nuôi", "214 ngày"], ["Bè", "B03"], ["Vùng nuôi", "Vân Đồn"]],
} as const;
