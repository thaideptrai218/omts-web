import type { SettingsSection } from "@/components/layout/header-menu";

/**
 * What the hub needs to know about the viewer. It is built once from the real permission checks of the workspace shell
 * (owner bypass, function-code holds, operation and resource gates) so no group here ever looks at a role name.
 */
export type SettingsGate = Readonly<{
  isOwner: boolean;
  /** True when the viewer holds the backend function code with that action (the Owner holds everything). */
  holds(functionCode: string, action: string): boolean;
  /** `operationAllowed(area, ...)` of the workspace. */
  operation(area: string): boolean;
  /** `resourceAllowed(key, ...)` of the workspace. */
  resource(key: string): boolean;
  /** `canReadProducts(...)` of the product catalogue. */
  canReadProducts: boolean;
}>;

type Item = SettingsSection["items"][number];
type Entry = readonly [allowed: boolean, item: Item];

/** Settings that open in place keep the `?section=<panel>` href so the gear menu and the hub agree on the selection. */
const panelHref = (panel: string) => `/settings?section=${panel}`;

/** Who may change an item, as a short Vietnamese caption; the backend stays the authority on every write. A setting appears in the hub only for people who can change it (backend writes are Owner-only except the cash book and job-type rates). */
const OWNER = "Chỉ chủ hợp tác xã sửa được";
const GRANTED = "Người được cấp quyền cũng sửa được";
const OWNER_VIEW = "Chủ hợp tác xã xem được";
const VIEW_ONLY = "Chỉ xem";
const PRICE_EDITORS = "Chủ hợp tác xã và người được cấp quyền đơn giá sửa được";

/** Purchase/crop readers that make the input catalogue settings relevant (same rule the gear menu used before the hub). */
const INPUT_READERS = ["PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "CULTIVATION_CYCLES", "INPUT_ISSUES"];

const keep = (entries: readonly Entry[]): Item[] => entries.filter(([allowed]) => allowed).map(([, item]) => item);

/**
 * The hub groups in KiotViet order. Items the viewer cannot reach are dropped and a group left empty is dropped as well,
 * so an account with nothing to configure gets `[]` and the shell hides the gear.
 */
export function buildSettingsGroups(gate: SettingsGate): SettingsSection[] {
  const { isOwner, holds, operation, resource } = gate;
  const groups: SettingsSection[] = [
    { key: "cooperative", label: "Hợp tác xã", items: keep([
      [isOwner, { href: "/cooperative/profile", label: "Hồ sơ hợp tác xã", icon: "cooperative", editor: OWNER, description: "Thông tin pháp lý, kênh liên hệ và tài khoản nhận chuyển khoản của hợp tác xã.", hint: "Cập nhật địa chỉ, số điện thoại hoặc người đại diện.", keywords: ["htx", "thông tin", "địa chỉ", "liên hệ", "pháp lý", "mã số thuế", "người đại diện", "thong tin", "dia chi", "lien he"] }],
      [isOwner, { href: "/cooperative/receiving-bank-account", label: "Ngân hàng nhận tiền", icon: "payment", editor: OWNER, description: "Tài khoản dùng để nhận chuyển khoản và tạo mã VietQR.", hint: "Đổi số tài khoản nhận tiền hoặc mã VietQR.", keywords: ["vietqr", "qr", "số tài khoản", "chuyển khoản", "nhận tiền", "ngân hàng", "ngan hang", "so tai khoan", "chuyen khoan"] }],
      [isOwner, { href: "/cooperative/certifications", label: "Chứng nhận HTX", icon: "document", editor: OWNER, description: "Hồ sơ chứng nhận, thời hạn hiệu lực và tệp đính kèm của hợp tác xã.", hint: "Thêm chứng nhận mới hoặc theo dõi ngày hết hạn.", keywords: ["chứng chỉ", "giấy phép", "vietgap", "hết hạn", "hiệu lực", "chung chi", "giay phep", "het han"] }],
    ]) },
    { key: "users", label: "Người dùng", items: keep([
      [resource("accounts"), { href: "/workspace/accounts", label: "Quản lý người dùng", icon: "id-card", editor: OWNER, description: "Tài khoản nội bộ, trạng thái truy cập và vai trò được phân công theo vùng.", hint: "Tạo tài khoản, khóa hoặc mở khóa, đặt lại mật khẩu, cấp vai trò theo vùng.", keywords: ["tài khoản", "người dùng", "nhân viên đăng nhập", "mật khẩu", "phân quyền", "vai trò", "đăng nhập", "khóa tài khoản", "tai khoan", "nguoi dung", "mat khau", "phan quyen", "vai tro", "dang nhap", "nhan vien dang nhap", "zone manager"] }],
      [resource("roles"), { href: "/workspace/roles", label: "Vai trò và quyền", icon: "roles", editor: VIEW_ONLY, description: "Đối chiếu vai trò và quyền hiện hành của hệ thống.", hint: "Xem mỗi vai trò làm được gì trước khi phân quyền.", keywords: ["phân quyền", "quyền hạn", "chức năng", "kế toán", "quản lý vùng", "zone manager", "phan quyen", "quyen han", "ke toan", "quan ly vung"] }],
    ]) },
    { key: "farming", label: "Nuôi trồng", items: keep([
      [isOwner, { href: panelHref("harvest"), panel: "harvest", label: "Thiết lập thu hoạch", icon: "work", editor: OWNER, description: "Khối lượng trung bình mỗi lồng và số ngày tự động đóng lô.", keywords: ["thu hoạch", "đóng lô", "khối lượng", "sản lượng", "thu hoach", "dong lo", "khoi luong"] }],
      [isOwner && operation("water"), { href: panelHref("water-thresholds"), panel: "water-thresholds", label: "Ngưỡng nước", icon: "water", editor: OWNER, description: "Ngưỡng pH, độ mặn và nhiệt độ để cảnh báo theo từng vùng.", hint: "Đặt ngưỡng pH, độ mặn, nhiệt độ cho từng vùng.", keywords: ["ph", "độ mặn", "nhiệt độ", "chất lượng nước", "cảnh báo", "do man", "nhiet do", "chat luong nuoc", "canh bao"] }],
    ]) },
    { key: "inputs", label: "Vật tư & Giống", items: keep([
      [isOwner && INPUT_READERS.some((fn) => holds(fn, "View")), { href: panelHref("input-inventory"), panel: "input-inventory", label: "Vật tư & Giống", icon: "material", editor: OWNER, description: "Đơn vị tính, nhóm hàng, loại xuất, cách tính giá vốn và cho phép xuất khi hết.", keywords: ["vật tư", "giống", "đơn vị tính", "nhóm hàng", "giá vốn", "tồn kho", "vat tu", "don vi tinh", "nhom hang", "gia von", "ton kho", "xuất kho"] }],
    ]) },
    { key: "hr", label: "Nhân sự", items: keep([
      [isOwner && operation("workforce"), { href: panelHref("attendance"), panel: "attendance", label: "Thiết lập chấm công", icon: "attendance", editor: OWNER, description: "Giờ nghỉ trưa, làm tròn phút và ngày bắt đầu áp dụng.", keywords: ["chấm công", "giờ nghỉ", "làm tròn", "ca làm", "cham cong", "gio nghi", "lam tron"] }],
      [operation("job-types"), { href: "/operations/job-types", label: "Loại công việc và đơn giá", icon: "work", editor: PRICE_EDITORS, description: "Đơn giá theo giờ và lịch sử ngày hiệu lực của từng loại công việc.", hint: "Thêm loại công việc hoặc đổi đơn giá theo giờ.", keywords: ["đơn giá", "giá công", "lương giờ", "công việc", "don gia", "gia cong", "luong gio", "cong viec"] }],
    ]) },
    { key: "sales", label: "Bán hàng", items: keep([
      [isOwner && gate.canReadProducts, { href: panelHref("products"), panel: "products", label: "Sản phẩm", icon: "product", editor: OWNER, description: "Nhóm sản phẩm hàu; đơn vị tính dùng chung với Vật tư & Giống.", keywords: ["hàu", "nhóm sản phẩm", "đơn vị tính", "hang hoa", "hau", "nhom san pham"] }],
      [isOwner && holds("CUSTOMERS", "View"), { href: panelHref("customers"), panel: "customers", label: "Khách hàng", icon: "users", editor: OWNER, description: "Cảnh báo công nợ và thông tin bắt buộc khi thêm khách hàng.", keywords: ["công nợ", "khách", "thương lái", "cong no", "khach", "thuong lai"] }],
    ]) },
    { key: "finance", label: "Tài chính", items: keep([
      [holds("CASH_BOOK_SETTINGS", "Edit"), { href: panelHref("cash-book"), panel: "cash-book", label: "Sổ quỹ", icon: "payment", editor: GRANTED, description: "Tài khoản ngân hàng, ví điện tử và loại thu chi dùng cho phiếu thu chi.", keywords: ["thu chi", "ngân hàng", "ví", "ví điện tử", "momo", "tiền mặt", "phiếu thu", "phiếu chi", "thu chi", "ngan hang", "vi dien tu", "tien mat", "phieu thu", "phieu chi", "quỹ", "quy"] }],
    ]) },
    { key: "system", label: "Hệ thống", items: keep([
      [isOwner, { href: "/audit", label: "Nhật ký thao tác", icon: "search", editor: OWNER_VIEW, description: "Tra cứu ai đã thao tác, lúc nào và bản ghi nào bị thay đổi.", hint: "Tra ai đã sửa gì, lúc nào.", keywords: ["lịch sử", "nhật ký", "log", "ai sửa", "lich su", "nhat ky", "thao tac"] }],
      [isOwner, { href: "/account/devices", label: "Phiên đăng nhập", icon: "lock", editor: OWNER, description: "Các thiết bị đang đăng nhập và thu hồi phiên.", hint: "Đăng xuất thiết bị lạ hoặc thiết bị đã mất.", keywords: ["thiết bị", "đăng xuất", "bảo mật", "thiet bi", "dang xuat", "bao mat", "đăng nhập", "dang nhap"] }],
    ]) },
  ];
  return groups.filter((group) => group.items.length);
}

