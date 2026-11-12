/** Legacy backend hints keep their meaning while using the nursery screen's vocabulary. */
export function nurseryCompletionMessage(message: string | undefined) {
  return message?.replace(/phân bổ/gi, word => word[0] === "P" ? "Số mảnh chuyển sang bè" : "số mảnh chuyển sang bè")
    .replace(/chu kỳ/gi, word => word[0] === "C" ? "Đợt nuôi" : "đợt nuôi");
}
