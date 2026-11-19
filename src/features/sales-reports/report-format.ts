import { formatVndWithSymbol } from "@/shared/format/vnd";

const kgFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const countFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** Tiền VND có ký hiệu; null/undefined hiện "—" (ví dụ cột chỉ có khi gộp theo khách). */
export const vnd = (value: number | null | undefined) => value == null ? "—" : formatVndWithSymbol(value);
export const kg = (value: number | null | undefined) => value == null ? "—" : `${kgFormat.format(value)} kg`;
export const count = (value: number | null | undefined) => value == null ? "—" : countFormat.format(value);
/** Số thuần (không đơn vị) cho tooltip biểu đồ kg. */
export const plainKg = (value: number) => kgFormat.format(value);
