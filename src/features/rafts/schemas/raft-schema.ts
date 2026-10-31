import { z } from "zod";

function coordinate(limit: number) {
  return z
    .string()
    .trim()
    .refine(
      (text) =>
        /^-?\d+(?:[.,]\d+)?$/.test(text) &&
        Math.abs(Number(text.replace(",", "."))) <= limit,
      `Nhập tọa độ hợp lệ từ −${limit} đến ${limit}.`,
    );
}
export const raftSchema = z.object({
  zoneId: z.string().min(1, "Chọn vùng nuôi."),
  code: z
    .string()
    .trim()
    .min(1, "Nhập mã bè.")
    .max(50, "Mã bè tối đa 50 ký tự."),
  latitude: coordinate(90),
  longitude: coordinate(180),
  location: z.string().trim().max(500, "Mô tả vị trí tối đa 500 ký tự."),
  size: z
    .string()
    .trim()
    .min(1, "Nhập kích thước bè.")
    .max(100, "Kích thước tối đa 100 ký tự."),
  conditionNotes: z.string().trim().max(2000, "Ghi chú tối đa 2.000 ký tự."),
  lanes: z
    .array(
      z.object({
        number: z.number().int().min(1),
        length: z
          .number({ error: "Nhập chiều dài làn." })
          .positive("Chiều dài phải lớn hơn 0.")
          .max(99999999.99, "Chiều dài quá lớn.")
          .refine(
            (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
            "Chiều dài tối đa 2 chữ số thập phân.",
          ),
        markerA: z
          .string()
          .trim()
          .min(1, "Nhập mốc A.")
          .max(50, "Mốc tối đa 50 ký tự."),
        markerB: z
          .string()
          .trim()
          .min(1, "Nhập mốc B.")
          .max(50, "Mốc tối đa 50 ký tự."),
      }),
    )
    .min(1, "Bè cần ít nhất một làn nuôi.")
    .refine(
      (lanes) => lanes.every((lane, i) => lane.number === i + 1),
      "Số làn phải liên tiếp từ 1.",
    ),
});
