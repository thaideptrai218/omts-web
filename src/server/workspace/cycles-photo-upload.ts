import "server-only";
import { z } from "zod";
import { cycleInput } from "@/features/cycles-api/contracts";
import { readBoundedBytes } from "../operations/bounded-body";

const command = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("start"), id: z.guid(), body: cycleInput }),
  z.strictObject({ action: z.literal("plan-photos"), id: z.guid(), body: z.strictObject({ rowVersion: z.string().min(1), keepPhotoIds: z.array(z.guid()).max(3).optional() }) }),
]);
const photoProblem = { field: "Photos", hint: "Cần từ 1 đến 3 ảnh JPEG hoặc PNG, mỗi ảnh không quá 10 MB." };

/** Bounded raw multipart fields for standalone cycle creation and replacement of owned plan photos. */
export async function readCyclePhotoUpload(request: Request) {
  const type = request.headers.get("content-type") ?? "", maxBytes = 31 * 1024 * 1024;
  const length = request.headers.get("content-length");
  if (!/^multipart\/form-data;\s*boundary=/i.test(type) || request.headers.has("content-encoding") || length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > maxBytes)) return { problem: photoProblem };
  try {
    const bytes = await readBoundedBytes(request.body, request.signal, maxBytes, 20_000);
    const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": type } }).formData();
    const values: Record<string, unknown> = {}, body: Record<string, unknown> = {}, photos = form.getAll("photos");
    for (const key of new Set(form.keys())) {
      if (key === "photos") continue;
      const parts = form.getAll(key);
      if (parts.some(part => typeof part !== "string" || part.length > 16_384)) return { problem: { field: key, hint: "Dữ liệu không hợp lệ." } };
      if (key === "keepPhotoIds") body[key] = parts;
      else {
        if (parts.length !== 1) return { problem: { field: key, hint: "Mỗi trường chỉ gửi một giá trị." } };
        if (key === "action" || key === "id") values[key] = parts[0];
        else body[key] = ["expectedSeedQuantity", "targetYieldKg"].includes(key) ? Number(parts[0]) : parts[0];
      }
    }
    if (values.action === "start") for (const key of ["startDate", "expectedSeedQuantity", "targetYieldKg"]) if (!(key in body)) body[key] = null;
    const parsed = command.safeParse({ ...values, body });
    if (!parsed.success) return { problem: { field: String(parsed.error.issues[0]?.path.at(-1) ?? "Dữ liệu"), hint: "Vui lòng kiểm tra dữ liệu kế hoạch nuôi." } };
    const kept = "keepPhotoIds" in parsed.data.body ? parsed.data.body.keepPhotoIds?.length ?? 0 : 0;
    if (photos.length + kept < 1 || photos.length + kept > 3) return { problem: photoProblem };
    for (const photo of photos) {
      if (typeof photo === "string" || !["image/jpeg", "image/png"].includes(photo.type) || photo.size < 1 || photo.size > 10 * 1024 * 1024) return { problem: photoProblem };
      const signature = new Uint8Array(await photo.slice(0, 8).arrayBuffer());
      const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value);
      if (!(photo.type === "image/jpeg" ? jpeg : png)) return { problem: photoProblem };
    }
    const upstream = new FormData();
    for (const [key, value] of Object.entries(parsed.data.body)) {
      if (Array.isArray(value)) value.forEach(part => upstream.append(key, String(part)));
      else if (value != null) upstream.set(key, String(value));
    }
    for (const photo of photos as File[]) upstream.append("photos", photo, photo.name);
    return { command: parsed.data, body: upstream };
  } catch { return { problem: photoProblem }; }
}
