/** Translate legacy backend copy at the display boundary; keep API names unchanged. */
export function nurseryDisplayText(value: string | null | undefined): string | undefined {
  return value?.replace(/tạo chu kỳ/gi, "bắt đầu nuôi")
    .replace(/chu kỳ (?:nuôi )?đang mở/gi, "đợt nuôi chưa kết thúc")
    .replace(/chu kỳ đã chốt/gi, "đợt nuôi đã kết thúc")
    .replace(/chu kỳ/gi, "đợt nuôi")
    .replace(/chuyển phân bổ/gi, "chuyển lại số mảnh")
    .replace(/điều chỉnh phân bổ/gi, "điều chỉnh số mảnh chuyển sang bè")
    .replace(/đã phân bổ/gi, "đã chuyển sang bè")
    .replace(/phân bổ cho bè/gi, match => match.startsWith("P") ? "Số mảnh chuyển sang bè" : "số mảnh chuyển sang bè")
    .replace(/phân bổ/gi, match => match.startsWith("P") ? "Số mảnh chuyển sang bè" : "số mảnh chuyển sang bè");
}
