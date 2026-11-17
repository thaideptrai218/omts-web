import type { z } from "zod";
import type { harvestWarning } from "./records-contracts";

type Warning = z.infer<typeof harvestWarning>;
const kg = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : undefined;

/** Vietnamese wording of a non-blocking warning saved with a harvest lot; unknown codes give nothing (the lot is saved anyway). */
export function harvestWarningText(warning: Warning): string | undefined {
  if (warning.code !== "ESTIMATED_KG_FAR_FROM_CAGES") return undefined;
  const worked = kg(warning.details?.workedKg), min = kg(warning.details?.minKg), max = kg(warning.details?.maxKg);
  return `Kg ước tính${worked ? ` (${worked} kg)` : ""} lệch nhiều so với số lồng${min && max ? `: khoảng hợp lý là ${min} đến ${max} kg` : ""}. Lô đã được lưu, hãy kiểm tra lại số liệu.`;
}

export const harvestWarningTexts = (warnings: readonly Warning[] | undefined) => (warnings ?? []).flatMap(warning => harvestWarningText(warning) ?? []);
