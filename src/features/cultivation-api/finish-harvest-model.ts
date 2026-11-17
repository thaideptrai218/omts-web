/** Both backend eligibility and the physical incident state must permit the command. */
export const eligibleToFinish = (lane: { laneNumber: number; state?: string | null; canFinish?: boolean | null; isDamaged?: boolean; isOutOfService?: boolean; statusId?: number }) =>
  lane.laneNumber >= 1 && lane.laneNumber <= 200 && lane.state === "BeingHarvested" && lane.canFinish === true && !lane.isDamaged && !lane.isOutOfService && lane.statusId !== 2002;
