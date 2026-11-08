import { z } from "zod";
import { isDateOnly } from "@/shared/format/date-only";

export function zoneNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}
function coordinate(label: string, lower: number, upper: number) {
  return z
    .string()
    .trim()
    .min(1, `Nhập ${label.toLocaleLowerCase("vi")}.`)
    .refine(
      (value) =>
        /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value) &&
        Number.isFinite(zoneNumber(value)) &&
        zoneNumber(value) >= lower &&
        zoneNumber(value) <= upper,
      `${label} phải từ ${lower} đến ${upper}.`,
    );
}
export const farmingZoneSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Nhập mã vùng.")
    .max(50, "Mã vùng tối đa 50 ký tự."),
  name: z
    .string()
    .trim()
    .min(1, "Nhập tên vùng.")
    .max(200, "Tên vùng tối đa 200 ký tự."),
  location: z
    .string()
    .trim()
    .min(1, "Nhập vị trí hoặc mô tả vị trí.")
    .max(500, "Vị trí tối đa 500 ký tự."),
  latitude: coordinate("Vĩ độ", -90, 90),
  longitude: coordinate("Kinh độ", -180, 180),
  area: z
    .string()
    .trim()
    .refine(
      (value) =>
        /^[\d.,]+$/.test(value) &&
        zoneNumber(value) > 0 &&
        zoneNumber(value) < 100_000_000_000_000,
      "Diện tích phải lớn hơn 0 và nhỏ hơn 100.000.000.000.000 ha.",
    ),
  waterMeasurementPoint: z
    .string()
    .trim()
    .min(1, "Nhập điểm đo nước đại diện.")
    .max(200, "Điểm đo tối đa 200 ký tự."),
});
export const zoneDocumentSchema = z
  .object({
    type: z.enum([
      "SEA_AREA_ALLOCATION",
      "AQUACULTURE_LICENSE",
      "FOOD_SAFETY_COMMITMENT",
      "OTHER",
    ]),
    number: z
      .string()
      .trim()
      .min(1, "Nhập số giấy tờ.")
      .max(100, "Số giấy tờ tối đa 100 ký tự."),
    effectiveDate: z.string().refine(isDateOnly, "Nhập ngày hiệu lực hợp lệ."),
    expiryDate: z
      .string()
      .refine(
        (value) => value === "" || isDateOnly(value),
        "Ngày hết hạn chưa hợp lệ.",
      ),
    issuingAuthority: z
      .string()
      .trim()
      .max(200, "Cơ quan cấp tối đa 200 ký tự."),
    holder: z.string().trim().max(200, "Chủ giấy tờ tối đa 200 ký tự."),
    legalScope: z
      .string()
      .trim()
      .max(1000, "Phạm vi pháp lý tối đa 1.000 ký tự."),
    zoneIds: z
      .array(z.string().min(1))
      .min(1, "Chọn ít nhất một vùng được giấy tờ bao phủ.")
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Vùng được chọn bị trùng.",
      ),
  })
  .refine(
    (value) => !value.expiryDate || value.expiryDate > value.effectiveDate,
    { path: ["expiryDate"], message: "Ngày hết hạn phải sau ngày hiệu lực." },
  );
export type ZoneDocumentFormValues = z.infer<typeof zoneDocumentSchema>;
