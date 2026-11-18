/** Một chuỗi số liệu (một nhóm cột hoặc một đường). `color` mặc định lấy theo thứ tự trong bảng màu. */
export type ChartSeries = Readonly<{ name: string; color?: string }>;

/** Một điểm trên trục ngang; `values[i]` là giá trị của `series[i]`. */
export type ChartPoint = Readonly<{ label: string; values: readonly number[] }>;

/** Đường phủ lên cột, vẽ theo trục phải (ví dụ cộng dồn); `values[i]` ứng với `points[i]`. */
export type ChartOverlayLine = Readonly<{ name: string; values: readonly number[]; color?: string }>;

/** Đường mốc ngang (ví dụ mục tiêu); vẽ theo trục phải nếu có đường phủ, ngược lại theo trục trái. */
export type ChartReferenceLine = Readonly<{ value: number; label: string }>;

export type ChartCommonProps = Readonly<{
  points: readonly ChartPoint[];
  series: readonly ChartSeries[];
  /** Định dạng số trong chú thích khi rê chuột và bảng thay thế; mặc định số kiểu Việt Nam. */
  valueFormat?: (value: number) => string;
  /** Định dạng nhãn trục tung; mặc định `valueFormat`. Dùng `formatMoneyShort` cho tiền. */
  axisFormat?: (value: number) => string;
  /** Tên mô tả biểu đồ cho trình đọc màn hình. */
  ariaLabel: string;
  /** Đang tải lần đầu: hiện khung chờ thay cho biểu đồ. */
  loading?: boolean;
  emptyText?: string;
  height?: number;
}>;
