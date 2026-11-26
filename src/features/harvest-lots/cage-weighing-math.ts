import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { weighedKgValue } from "./contracts";

/** What was brought up (cages x kg per cage, an estimate) against what the port scale says: the difference in kg and its share of the estimate. */
export function weighComparison(estimatedKg: number, weighedKg: number) {
  const difference = Math.round((weighedKg - estimatedKg) * 1000) / 1000;
  return { difference, percent: estimatedKg > 0 ? Math.round((difference / estimatedKg) * 1000) / 10 : null };
}

/** Sum of kg rounded to the 3 decimals the API keeps, so 0.1 + 0.2 shows 0,3. */
export const sumKg = (values: readonly number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) * 1000) / 1000;

/** The kg of one cage typed as text ("12,5" or "12.5"): more than 0, at most 3 decimals. Empty text is "not typed yet" (no message). */
export function parseCageKg(text: string): { kg?: number; error?: string } {
  const typed = text.trim().replace(",", ".");
  if (!typed) return {};
  if (!/^\d+(\.\d+)?$/.test(typed)) return { error: "Nhập số kg, ví dụ 12,5." };
  const kg = Number(typed);
  if (!weighedKgValue.safeParse(kg).success) return { error: kg <= 0 ? "Số kg phải lớn hơn 0." : "Tối đa 3 số lẻ." };
  return { kg };
}

/** A lot waiting for a trader to see the same cages: plain Vietnamese for the refusals of the cage routes; undefined leaves the generic text. */
export function cageErrorText(result: Exclude<WorkspaceResult<unknown>, { status: "success" }>, action: "cage" | "complete"): string | undefined {
  if (result.httpStatus === 403) return "Bạn không có quyền cân lô này.";
  if (result.httpStatus === 404) return "Không tìm thấy lô hoặc lồng này. Hãy tải lại phiếu cân.";
  if (result.code === "MSG06") return "Phiếu cân vừa được người khác thay đổi. Hãy tải lại phiếu rồi hoàn tất.";
  if (result.httpStatus === 409) return "Lô đã đóng hoặc đã đổi trạng thái nên không sửa được phiếu cân. Hãy tải lại phiếu.";
  if (result.httpStatus === 400) return action === "cage" ? "Số kg phải lớn hơn 0 và có tối đa 3 số lẻ, sản phẩm phải thuộc lô này." : "Chưa hoàn tất được. Hãy cân ít nhất một lồng cho mỗi sản phẩm của lô.";
  return undefined;
}
