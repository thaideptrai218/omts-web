import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES } from "./claim-contracts";

export type PhotoSelection = { files: File[]; problems: string[] };

/**
 * Gộp ảnh mới chọn vào danh sách đang có theo giới hạn của backend (CLAIM-01): JPEG hoặc PNG, mỗi ảnh tối đa 10 MB, tối đa 10 ảnh.
 * Ảnh sai loại, quá lớn, rỗng, trùng (cùng tên, cỡ, thời điểm sửa) hoặc vượt số lượng bị bỏ và được nêu lý do; ảnh hợp lệ vẫn được giữ.
 */
export function addPhotos(current: readonly File[], incoming: readonly File[]): PhotoSelection {
  const files = [...current], problems: string[] = [];
  const same = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  for (const file of incoming) {
    if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) problems.push(`"${file.name}" không phải ảnh JPEG hoặc PNG.`);
    else if (file.size < 1) problems.push(`"${file.name}" là tệp rỗng.`);
    else if (file.size > MAX_PHOTO_BYTES) problems.push(`"${file.name}" lớn hơn 10 MB.`);
    else if (files.some((existing) => same(existing, file))) problems.push(`"${file.name}" đã được chọn.`);
    else if (files.length >= MAX_PHOTOS) problems.push(`Chỉ gửi tối đa ${MAX_PHOTOS} ảnh; "${file.name}" chưa được thêm.`);
    else files.push(file);
  }
  return { files, problems };
}
