/** Old transfer errors must not direct users into a workflow that no longer exists. */
export function nurseryDisplayText(value: string | null | undefined): string | undefined {
  if (value && /phân bổ|chuyển (?:lại )?số mảnh|chuyển sang bè/i.test(value)) return "Thông tin đợt ươm đã thay đổi. Hãy tải lại để đối chiếu.";
  return value?.replace(/đã hoàn tất/gi, "Đã ươm xong");
}
