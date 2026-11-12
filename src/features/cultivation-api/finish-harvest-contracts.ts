import { z } from "zod";

const laneNumber = z.number().int().min(1).max(200);
const distinctLanes = z.array(laneNumber).max(200).refine(values => new Set(values).size === values.length);
/** The bulk command is atomic; lane numbers are physical numbers, never record ids. */
export const finishHarvestValues = z.strictObject({ laneNumbers: distinctLanes.min(1), rowVersion: z.string().min(1).max(1000).optional() });
export const finishHarvestResult = z.object({ finished: distinctLanes, alreadyFinished: distinctLanes })
  .refine(value => !value.finished.some(number => value.alreadyFinished.includes(number)));
export const finishHarvestLaneProblem = z.object({ laneNumber, reasonCode: z.string().min(1).max(100), message: z.string().min(1).max(400) });
export type FinishHarvestLaneProblem = z.infer<typeof finishHarvestLaneProblem>;

/** Ignore no lanes silently: a malformed/incomplete 200 must be reconciled before another write. */
export function matchesFinishedSelection(requested: readonly number[], result: z.infer<typeof finishHarvestResult>): boolean {
  const returned = [...result.finished, ...result.alreadyFinished];
  return returned.length === requested.length && returned.every(number => requested.includes(number));
}
