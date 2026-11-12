export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_QUALITY = 0.82;

/** Pure sizing policy, shared by decoding/encoding and covered without a browser. */
export function compressedPhotoDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("Kích thước ảnh không hợp lệ.");
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export function photoValidationMessage(count: number, required = true): string | undefined {
  if (count > 3 || required && count < 1) return `Đã chọn ${count} ảnh; ${required ? "cần từ 1 đến 3" : "chỉ được tối đa 3"} ảnh.`;
}

/** Decode EXIF before drawing; the encoded JPEG pixels retain the displayed orientation. */
export async function compressPhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("Chỉ chọn ảnh JPEG hoặc PNG.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error("Mỗi ảnh phải có dữ liệu và không vượt quá 10 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const dimensions = compressedPhotoDimensions(bitmap.width, bitmap.height), canvas = document.createElement("canvas");
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không xử lý được ảnh. Hãy chọn ảnh khác.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Không nén được ảnh.")), "image/jpeg", PHOTO_QUALITY));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } finally { bitmap.close(); }
}
export function photoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Không đọc được ảnh.")); reader.readAsDataURL(file); });
}
