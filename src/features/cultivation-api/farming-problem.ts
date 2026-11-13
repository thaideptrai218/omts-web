import { z } from "zod";
import { finishHarvestLaneProblem } from "./finish-harvest-contracts";

const guid = z.guid(), num = z.number().finite();
/**
 * The allow-listed part of a failed Nuôi trồng write that the forms act on (the BFF passes on nothing else of the backend problem).
 * - confirmFlag: the backend asks a question and wants the same request again with that flag (MSG-GEN-04 of the seeding plan, MSG-CYCLE-01, MSG-CYCLE-07).
 * - onHand/balanceAfter/itemId/seedLotLineId: the stock check (MSG-INPUT-01), in the unit of the item.
 * - sourceKind/sourceRecordId/cycleId: the record that owns a posted issue (MSG-GEN-09 on the Xuất dùng screens).
 * Every key is optional and unknown or malformed ones are dropped, so an older or newer backend never breaks the form.
 */
export const farmingProblem = z.object({
  code: z.string().regex(/^(?:MSG-[A-Z]+-\d{2}|NURSERY_POOL_EXCEEDED)$/).optional().catch(undefined),
  reasonCode: z.string().max(100).optional().catch(undefined),
  hint: z.string().max(1000).optional().catch(undefined),
  laneNumber: num.optional().catch(undefined), remainingPercent: num.optional().catch(undefined),
  allocated: num.optional().catch(undefined), seeded: num.optional().catch(undefined), remaining: num.optional().catch(undefined),
  field: z.string().max(60).optional().catch(undefined),
  fields: z.array(z.string().max(60)).max(20).optional().catch(undefined),
  message: z.string().max(400).optional().catch(undefined),
  detail: z.string().max(400).optional().catch(undefined),
  confirmFlag: z.enum(["confirmOverPlan", "confirmEmpty", "ownerApproved"]).optional().catch(undefined),
  laneNumbers: z.array(z.number().int().positive()).max(200).optional().catch(undefined),
  lanes: z.array(finishHarvestLaneProblem).max(200).optional().catch(undefined),
  onHand: num.nullish().catch(undefined), balanceAfter: num.nullish().catch(undefined),
  itemId: guid.nullish().catch(undefined), seedLotLineId: guid.nullish().catch(undefined),
  sourceKind: z.enum(["None", "Seeding", "MaterialUsage"]).nullish().catch(undefined),
  sourceRecordId: guid.nullish().catch(undefined), cycleId: guid.nullish().catch(undefined),
});
export type FarmingProblem = z.infer<typeof farmingProblem>;

/** Parses an untrusted problem object (the backend body on the server, `problem` of the BFF answer in the browser). */
export function projectFarmingProblem(value: unknown): FarmingProblem | undefined {
  if (!value || typeof value !== "object") return undefined;
  const parsed = farmingProblem.safeParse(Array.isArray(value) ? { lanes: value } : value);
  if (!parsed.success) return undefined;
  const keys = Object.entries(parsed.data).filter(([, entry]) => entry !== undefined && entry !== null && !(Array.isArray(entry) && !entry.length));
  return keys.length ? (Object.fromEntries(keys) as FarmingProblem) : undefined;
}

const area = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
export function nurseryPoolExceededText(problem?: Pick<FarmingProblem, "remaining">): string {
  return problem?.remaining != null
    ? `Chỉ còn ${area(problem.remaining)} mảnh trong kho ươm (ước tính). Hãy giảm số mảnh hoặc tải lại để đối chiếu.`
    : "Số mảnh vượt kho ươm còn lại. Hãy tải lại để đối chiếu.";
}
/** Match a backend refusal to its input, keeping Vietnamese hints. */
export function farmingFieldError(problem: FarmingProblem | undefined, ...fields: string[]): string | undefined {
  const quantityField = fields.some(field => field.toLowerCase() === "quantity");
  if (quantityField && [problem?.code, problem?.reasonCode].includes("NURSERY_POOL_EXCEEDED")) return nurseryPoolExceededText(problem);
  if (!problem || !fields.some(field => problem.field?.toLowerCase() === field.toLowerCase() || problem.fields?.some(value => value.toLowerCase() === field.toLowerCase()))) return;
  const hint = problem.hint ?? problem.message;
  if (hint && /[À-ỹ]/.test(hint)) return hint;
  if (fields.includes("Photos")) return "Ảnh chưa hợp lệ. Chọn từ 1 đến 3 ảnh JPEG/PNG, mỗi ảnh tối đa 10 MB.";
  if (fields.includes("LanePercent")) return `Phần trăm làn${problem.laneNumber ? ` ${problem.laneNumber}` : ""} chưa hợp lệ${problem.remainingPercent != null ? `; còn ${area(problem.remainingPercent)}% có thể ghi thêm` : "; nhập số lớn hơn 0 đến 100, tối đa 2 số lẻ"}.`;
  if (quantityField) return "Số mảnh lấy hôm nay phải lớn hơn 0. Kiểm tra lại số mảnh đã nhập.";
  return "Kiểm tra lại giá trị đã nhập.";
}
/** Vietnamese sentence for the stock check of seeding / material usage; unit comes from the item. */
export function stockShortageText(problem: FarmingProblem, unit?: string): string {
  const suffix = unit ? ` ${unit}` : "";
  const onHand = typeof problem.onHand === "number" ? `Còn trong kho ${area(problem.onHand)}${suffix}. ` : "";
  const after = typeof problem.balanceAfter === "number" ? `Sau khi xuất sẽ còn ${area(problem.balanceAfter)}${suffix}. ` : "";
  return `${onHand}${after}Hãy giảm số lượng hoặc nhập thêm hàng vào kho trước khi ghi nhận.`;
}
