import "server-only";
import { createHash } from "node:crypto";

/** Short stamp of the stored file (its path, not the signed query), so a replaced photo gets a new address while an unchanged one stays cached. */
function stamp(photoUrl: string, origin: string): string {
  let key = photoUrl;
  try { key = new URL(photoUrl, origin).pathname; } catch { /* keep the raw text */ }
  return createHash("sha256").update(key).digest("hex").slice(0, 10);
}

/**
 * Photos are shown through the BFF (`action=photo`), never by the signed backend address: this rewrites every `photoUrl` of an employee answer
 * (a list page, one employee, or a receipt holding `employee`) to that address. An employee without a photo keeps null.
 */
export function rewriteEmployeePhotos<T>(value: T, origin: string): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.items)) record.items = record.items.map(item => rewriteEmployeePhotos(item, origin));
  if (record.employee && typeof record.employee === "object") record.employee = rewriteEmployeePhotos(record.employee, origin);
  if ("photoUrl" in record && typeof record.id === "string") {
    record.photoUrl = typeof record.photoUrl === "string" && record.photoUrl ? `/api/operations/employees?${new URLSearchParams({ action: "photo", id: record.id, v: stamp(record.photoUrl, origin) })}` : null;
  }
  return value;
}
