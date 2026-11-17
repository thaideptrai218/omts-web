import { fromQueryDate, toQueryDate } from "./time-range-model";

/** Preserve only date digits and insert separators without interpreting partial input. */
export function maskDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

/** Reject impossible dates rather than letting JavaScript roll them into the next month. */
export function parseDateInput(value: string, min?: string, max?: string): { value?: string; error?: string } {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return { error: "Nhập ngày theo định dạng dd/mm/yyyy." };
  const [day, month, year] = value.split("/");
  const query = `${year}-${month}-${day}`;
  if (Number(year) < 1000 || toQueryDate(fromQueryDate(query)) !== query) return { error: "Ngày không hợp lệ. Vui lòng kiểm tra lại." };
  if (min && query < min.slice(0, 10)) return { error: `Ngày phải từ ${min.slice(8, 10)}/${min.slice(5, 7)}/${min.slice(0, 4)}.` };
  if (max && query > max.slice(0, 10)) return { error: `Ngày không được sau ${max.slice(8, 10)}/${max.slice(5, 7)}/${max.slice(0, 4)}.` };
  return { value: query };
}
