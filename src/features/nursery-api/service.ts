import { nurseryRepository } from "./repository";
import { nurseryDetailSchema, nurseryHistorySchema, nurseryListSchema, nurseryLotsSchema } from "./contracts";

export const nurseryService = {
  list: (query: Record<string, string>, signal?: AbortSignal) => nurseryRepository.read("list", query, nurseryListSchema, signal),
  detail: (id: string, zoneId: string, signal?: AbortSignal) => nurseryRepository.read("detail", { id, zoneId }, nurseryDetailSchema, signal),
  lots: (zoneId: string, signal?: AbortSignal) => nurseryRepository.read("seed-lots", { zoneId }, nurseryLotsSchema, signal),
  history: (id: string, zoneId: string, signal?: AbortSignal) => nurseryRepository.read("history", { id, zoneId }, nurseryHistorySchema, signal),
  save: (action: "create" | "update" | "complete" | "cancel" | "survivors" | "allocations", zoneId: string, body: unknown, id?: string) => nurseryRepository.write(action, { zoneId, ...(id ? { id } : {}) }, body, nurseryDetailSchema),
};
/** The API expects one JSON string for allocations; only photo ids and photos repeat. */
export function nurseryMultipart(values: Record<string, unknown>, photos: File[] = []) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    if (key === "allocations") form.set(key, JSON.stringify(value));
    else if (Array.isArray(value)) for (const part of value) form.append(key, String(part));
    else form.set(key, String(value));
  }
  for (const file of photos) form.append("photos", file, file.name);
  return form;
}
