import { z } from "zod";

const guid = z.guid(), num = z.number().finite();
/**
 * The allow-listed part of a failed Nuôi trồng write that the forms act on (the BFF passes on nothing else of the backend problem).
 * - confirmFlag: the backend asks a question and wants the same request again with that flag (MSG-GEN-04, MSG-CYCLE-01, MSG-CYCLE-07).
 * - totalKg/harvestedKg/newKg/targetYieldKg/overPlanPercent: the over-plan question of a harvest (all ESTIMATED kg).
 * - onHand/balanceAfter/itemId/seedLotLineId: the stock check (MSG-INPUT-01), in the unit of the item.
 * - sourceKind/sourceRecordId/cycleId: the record that owns a posted issue (MSG-GEN-09 on the Xuất dùng screens).
 * Every key is optional and unknown or malformed ones are dropped, so an older or newer backend never breaks the form.
 */
export const farmingProblem = z.object({
  code: z.string().regex(/^MSG-[A-Z]+-\d{2}$/).optional().catch(undefined),
  field: z.string().max(60).optional().catch(undefined),
  fields: z.array(z.string().max(60)).max(20).optional().catch(undefined),
  message: z.string().max(400).optional().catch(undefined),
  confirmFlag: z.enum(["confirmOverPlan", "confirmEmpty", "ownerApproved"]).optional().catch(undefined),
  laneNumbers: z.array(z.number().int().positive()).max(200).optional().catch(undefined),
  targetYieldKg: num.nullish().catch(undefined), harvestedKg: num.nullish().catch(undefined), newKg: num.nullish().catch(undefined),
  totalKg: num.nullish().catch(undefined), overPlanPercent: num.nullish().catch(undefined),
  onHand: num.nullish().catch(undefined), balanceAfter: num.nullish().catch(undefined),
  itemId: guid.nullish().catch(undefined), seedLotLineId: guid.nullish().catch(undefined),
  sourceKind: z.enum(["None", "Seeding", "MaterialUsage"]).nullish().catch(undefined),
  sourceRecordId: guid.nullish().catch(undefined), cycleId: guid.nullish().catch(undefined),
});
export type FarmingProblem = z.infer<typeof farmingProblem>;

/** Parses an untrusted problem object (the backend body on the server, `problem` of the BFF answer in the browser). */
export function projectFarmingProblem(value: unknown): FarmingProblem | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const parsed = farmingProblem.safeParse(value);
  if (!parsed.success) return undefined;
  const keys = Object.entries(parsed.data).filter(([, entry]) => entry !== undefined && entry !== null);
  return keys.length ? (Object.fromEntries(keys) as FarmingProblem) : undefined;
}

const area = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
/** Vietnamese sentence for the stock check of seeding / material usage; unit comes from the item. */
export function stockShortageText(problem: FarmingProblem, unit?: string): string {
  const suffix = unit ? ` ${unit}` : "";
  const onHand = typeof problem.onHand === "number" ? `Còn trong kho ${area(problem.onHand)}${suffix}. ` : "";
  const after = typeof problem.balanceAfter === "number" ? `Sau khi xuất sẽ còn ${area(problem.balanceAfter)}${suffix}. ` : "";
  return `${onHand}${after}Hãy giảm số lượng hoặc nhập thêm hàng vào kho trước khi ghi nhận.`;
}
