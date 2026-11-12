/** Browser decoding applies EXIF orientation before the canvas is encoded, avoiding rotated JPEG previews. */
export async function compressNurseryPhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("Chỉ chọn ảnh JPEG hoặc PNG.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Mỗi ảnh không được vượt quá 10 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không xử lý được ảnh. Hãy chọn ảnh khác.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Không nén được ảnh.")), "image/jpeg", 0.82));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } finally { bitmap.close(); }
}
export function nurseryPhotoPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Không đọc được ảnh.")); reader.readAsDataURL(file); });
}
