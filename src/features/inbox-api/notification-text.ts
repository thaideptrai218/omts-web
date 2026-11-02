import { z } from "zod";

const text = z.string().trim().min(1).max(500), day = z.iso.date();
const license = z.object({ document_type: z.enum(["SEA_AREA_ALLOCATION", "AQUACULTURE_LICENSE", "FOOD_SAFETY_COMMITMENT", "OTHER"]), document_number: text,
  zone_codes: z.array(text).max(100), expiry_date: day });
const licenseNames = { SEA_AREA_ALLOCATION: "Quyết định giao khu vực biển", AQUACULTURE_LICENSE: "Giấy phép nuôi trồng thủy sản", FOOD_SAFETY_COMMITMENT: "Cam kết an toàn thực phẩm", OTHER: "Giấy tờ" };
const date = (value: string) => value.split("-").reverse().join("/");
const amount = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
const outside = z.object({ indicator: z.enum(["PH", "SALINITY"]), value: z.number().finite(), unit: z.string().nullable(), direction: z.enum(["High", "Low"]),
  min: z.number().finite().nullable(), max: z.number().finite().nullable() });

/** Catalogue #23: translate atomic parameters, never derive identifiers or messages from English prose. */
export function notificationText(code: string | null, parameters: unknown, fallback: { title: string; body: string | null }) {
  if (code === null) return fallback; // Historical rows can predate structured content.
  if (code === "MSG-WATER-03") {
    const parsed = z.object({ corrected: z.boolean(), zone_name: text, raft_code: text.nullable(), measurement_time: z.iso.datetime({ offset: true }), values_outside: z.array(outside).min(1).max(2) }).safeParse(parameters);
    if (!parsed.success) return undefined;
    const p = parsed.data, when = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(p.measurement_time));
    const values = p.values_outside.map((v) => {
      const unit = v.indicator === "SALINITY" ? " ‰" : "", metric = v.indicator === "PH" ? "pH" : "Độ mặn";
      const limit = v.min !== null && v.max !== null ? `${amount(v.min)}–${amount(v.max)}${unit}` : v.min !== null ? `ít nhất ${amount(v.min)}${unit}` : v.max !== null ? `tối đa ${amount(v.max)}${unit}` : "chưa đặt ngưỡng";
      return `${metric} ${amount(v.value)}${unit} ${v.direction === "High" ? "cao" : "thấp"} hơn ngưỡng cho phép (${limit})`;
    }).join("; ");
    return { title: p.corrected ? "Cảnh báo nước — phép đo đã hiệu chỉnh" : "Cảnh báo chất lượng nước", body: `Vùng ${p.zone_name}, bè ${p.raft_code ?? "—"}, đo lúc ${when}. ${values}. Vui lòng kiểm tra nước.` };
  }
  if (code === "MSG-WATER-06") {
    const parsed = z.object({ zone_name: text, last_date: day }).safeParse(parameters);
    return parsed.success ? { title: "Nhắc đo nước", body: `Vùng ${parsed.data.zone_name} chưa có phép đo nước kể từ ${date(parsed.data.last_date)}. Vui lòng đo nước và ghi kết quả vào OMTS.` } : undefined;
  }
  if (code === "MSG-FARM-01" || code === "MSG-FARM-02") {
    const parsed = (code === "MSG-FARM-01" ? license.extend({ days: z.number().int().nonnegative() }) : license).safeParse(parameters);
    if (!parsed.success) return undefined;
    const p = parsed.data, document = `${licenseNames[p.document_type]} ${p.document_number}${p.zone_codes.length ? ` (${p.zone_codes.join(", ")})` : ""}`;
    return code === "MSG-FARM-01" ? { title: "Giấy phép sắp hết hạn", body: `${document} hết hạn ngày ${date(p.expiry_date)}, còn ${"days" in p ? p.days : 0} ngày. Vui lòng gia hạn và cập nhật giấy tờ.` }
      : { title: "Giấy phép đã hết hạn", body: `${document} đã hết hạn ngày ${date(p.expiry_date)}. Vui lòng gia hạn và cập nhật giấy tờ.` };
  }
  // A later module can add a code before this client ships its translation.
  return { title: "Thông báo mới", body: "Bạn có thông báo mới từ hợp tác xã." };
}
