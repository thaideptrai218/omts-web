import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { provinceList, taxLookup, wardList } from "./contracts";

export type Failure = Extract<WorkspaceResult<never>, { status: "error" }>;
export type Result<T> = { status: "success"; data: T } | Failure;

async function read<T>(url: string, schema: z.ZodType<T>): Promise<Result<T>> {
  try {
    const response = await bffFetch(url, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data }
      : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}

/**
 * The province list and each province's ward list are read once per browser session and shared by every form: the list of a province is loaded
 * the first time that province is picked. A failed read is not kept, so the next try asks again.
 */
const kept = new Map<string, Promise<Result<never>>>();
function remember<T>(key: string, load: () => Promise<Result<T>>): Promise<Result<T>> {
  const known = kept.get(key) as Promise<Result<T>> | undefined;
  if (known) return known;
  const next = load().then((result) => { if (result.status !== "success") kept.delete(key); return result; });
  kept.set(key, next as Promise<Result<never>>);
  return next;
}

export const addressRepository = {
  provinces: () => remember("provinces", () => read("/api/administrative-units?action=provinces", provinceList)),
  wards: (provinceCode: number) => remember(`wards:${provinceCode}`, () => read(`/api/administrative-units?action=wards&provinceCode=${provinceCode}`, wardList)),
  lookupTaxCode: (taxCode: string) => read(`/api/tax-lookup?taxCode=${encodeURIComponent(taxCode)}`, taxLookup),
  /** Forgets what was read, for the tests. */
  reset() { kept.clear(); },
};

/** What to tell when the units could not be loaded. */
export const unitsError = (kind: "province" | "ward") => `Chưa tải được danh sách ${kind === "province" ? "tỉnh/thành" : "phường/xã"}.`;

/** What to tell when a tax code could not be looked up; the fields stay open for typing by hand. */
export function lookupError(result: Failure) {
  if (result.httpStatus === 404) return "Không tìm thấy doanh nghiệp có mã số thuế này. Hãy kiểm tra lại mã hoặc nhập thông tin thủ công.";
  if (result.httpStatus === 400) return "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số, dấu gạch ngang và 3 chữ số.";
  if (result.httpStatus === 403) return "Bạn không có quyền tra cứu mã số thuế.";
  if (result.httpStatus === 429) return "Tra cứu quá nhiều lần trong một phút. Hãy đợi một chút rồi thử lại.";
  if (result.httpStatus === 401) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  return "Chưa tra cứu được mã số thuế lúc này. Hãy thử lại sau hoặc nhập thông tin thủ công.";
}
