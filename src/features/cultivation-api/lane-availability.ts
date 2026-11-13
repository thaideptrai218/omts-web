/** Incident facts take precedence over legacy suggestion flags; absent additions keep old reads working. */
export function laneIsUnavailable(lane: { isDamaged?: boolean; isOutOfService?: boolean; statusId?: number; state?: string | number | null }) {
  return lane.isDamaged === true || lane.isOutOfService === true || lane.statusId === 2002 || lane.state === "OutOfService" || lane.state === 4;
}
