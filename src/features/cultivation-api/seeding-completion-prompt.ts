import { seedingLaneChoices } from "./seeding-lane-choices";

type PromptData = {
  seedingCompletedOn: string | null; nurseryBatchId?: string | null; nurseryCode?: string | null; nurseryRemaining?: number | null;
  records: readonly unknown[]; lanes: Parameters<typeof seedingLaneChoices>[0]; seedableLaneNumbers?: readonly number[] | null;
};

/** Said in the success toast right after the save that used the last nursed pieces, and again in the banner. */
export const nurseryUsedUpMessage = (code?: string | null) => `Đã thả hết số mảnh đã ươm của đợt ${code ?? "ươm"}. Hãy đánh dấu hoàn tất thả giống.`;

/**
 * Text asking the user to mark seeding complete, or null while there is still something to seed: the nursed batch of the cycle is used up
 * (`nurseryRemaining` = 0) or every lane that can be seeded is at 100%. Never offered before a first record or after completion.
 */
export function seedingCompletionPrompt(data: PromptData): string | null {
  if (data.seedingCompletedOn || !data.records.length) return null;
  if (data.nurseryBatchId && data.nurseryRemaining != null && data.nurseryRemaining <= 0) return nurseryUsedUpMessage(data.nurseryCode);
  if (data.lanes.some(lane => (lane.seededPercent ?? 0) >= 100) && !seedingLaneChoices(data.lanes, [], data.seedableLaneNumbers).length) return "Tất cả các làn có thể thả đã đạt 100%. Hãy đánh dấu hoàn tất thả giống.";
  return null;
}
