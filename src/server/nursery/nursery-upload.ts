import "server-only";
import { readBoundedBytes } from "../operations/bounded-body";
import type { NurseryPlan } from "./nursery-plan";

const labels: Record<string, string> = { seedLotId: "Lô giống", quantity: "Số mảnh vào ươm", startDate: "Ngày bắt đầu ươm",
  survivors: "Số sống sót (ước tính)", completedOn: "Ngày hoàn tất ươm",
  rowVersion: "Phiên bản bản ghi", note: "Ghi chú", keepPhotoIds: "Ảnh", reason: "Lý do" };
export function validationProblem(path?: PropertyKey, hint?: string) {
  const field = typeof path === "string" ? labels[path] ?? path : "Dữ liệu";
  return { field, hint: hint && /[À-ỹ]/.test(hint) ? hint : `Vui lòng kiểm tra trường ${field.toLocaleLowerCase("vi-VN")}.` };
}

/** Nursery uses the backend's raw fields, rather than the older files/payload envelope. */
export async function readNurseryUpload(request: Request, plan: NurseryPlan) {
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(type) || request.headers.has("content-encoding")) return { problem: validationProblem() };
  const maxBytes = 31 * 1024 * 1024;
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > maxBytes)) return { problem: { field: "Ảnh", hint: "Chỉ chọn tối đa 3 ảnh, mỗi ảnh không quá 10 MB." } };
  try {
    const bytes = await readBoundedBytes(request.body, request.signal, maxBytes, 20_000);
    const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": type } }).formData();
    const input: Record<string, unknown> = {};
    const photos: File[] = [];
    for (const key of new Set(form.keys())) {
      const values = form.getAll(key);
      if (key === "photos") {
        if (values.some(value => typeof value === "string")) return { problem: validationProblem("keepPhotoIds") };
        photos.push(...values as File[]);
      } else if (key === "keepPhotoIds") {
        if (values.some(value => typeof value !== "string")) return { problem: validationProblem(key) };
        input[key] = values;
      } else {
        if (values.length !== 1 || typeof values[0] !== "string" || values[0].length > 32_768) return { problem: validationProblem(key) };
        const value = values[0];
        if (["quantity", "survivors"].includes(key)) input[key] = /^\d+(?:\.\d{1,2})?$/.test(value) ? Number(value) : Number.NaN;
        else input[key] = value;
      }
    }
    const parsed = plan.validator!.safeParse(input);
    if (!parsed.success) return { problem: validationProblem(parsed.error.issues[0]?.path[0], parsed.error.issues[0]?.message) };
    const kept = Array.isArray(input.keepPhotoIds) ? input.keepPhotoIds.length : 0;
    const changedPhotos = form.has("photos") || form.has("keepPhotoIds");
    if (photos.length > 3 || (plan.action !== "update" || changedPhotos) && (photos.length + kept < 1 || photos.length + kept > 3))
      return { problem: { field: "Ảnh", hint: "Cần từ 1 đến 3 ảnh JPEG hoặc PNG." } };
    for (const file of photos) {
      if (file.size < 1 || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type)) return { problem: { field: "Ảnh", hint: "Chỉ nhận ảnh JPEG hoặc PNG, mỗi ảnh không quá 10 MB." } };
      const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value);
      if (!(file.type === "image/jpeg" ? jpeg : png)) return { problem: { field: "Ảnh", hint: "Tệp ảnh không đúng định dạng JPEG hoặc PNG." } };
    }
    const body = new FormData();
    for (const [key, value] of Object.entries(parsed.data as Record<string, unknown>)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) for (const part of value) body.append(key, String(part));
      else body.append(key, String(value));
    }
    for (const photo of photos) body.append("photos", photo, photo.name);
    return { body };
  } catch { return { problem: { field: "Ảnh và dữ liệu", hint: "Không đọc được dữ liệu gửi lên. Vui lòng kiểm tra ảnh và thử lại." } }; }
}
