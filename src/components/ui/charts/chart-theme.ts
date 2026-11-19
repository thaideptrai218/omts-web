/** Bảng màu cùng gam với biểu đồ Sản lượng nuôi cũ: cột chính xanh ngọc, các vùng dùng chuỗi màu phân biệt. */
export const CHART_PALETTE = ["#2f8f83", "#2563eb", "#b45309", "#7c3aed", "#be123c", "#4d7c0f", "#0369a1", "#a16207"] as const;

/** Đường phủ (cộng dồn) và đường mốc dùng token chữ để tương phản tốt với nền. */
export const OVERLAY_COLOR = "var(--omts-color-text)";
export const REFERENCE_COLOR = "#b45309";

export const AXIS_TICK = { fontSize: 10, fill: "var(--omts-color-text-muted)" } as const;
export const GRID_STROKE = "var(--omts-color-border)";

export const seriesColor = (index: number, color?: string) => color ?? CHART_PALETTE[index % CHART_PALETTE.length];

/** Số kiểu Việt Nam, dùng khi không truyền `valueFormat`. */
const vnNumber = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
export const defaultFormat = (value: number) => vnNumber.format(value);

/** Chỉ hiện khoảng 9 nhãn trục ngang để không chồng chữ khi có nhiều kỳ. */
export const labelInterval = (count: number) => Math.max(0, Math.ceil(count / 9) - 1);
