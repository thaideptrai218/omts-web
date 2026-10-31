import { lanePortions } from "./lane-portions";
import type { RaftCondition, RaftConditionInput, RaftRecord } from "./raft";

export function projectRaftCondition(
  record: RaftRecord,
  input: RaftConditionInput,
): RaftCondition {
  const { profile, events } = record;
  const layout = [...profile.layouts]
    .sort((a, b) => a.version - b.version)
    .filter((version) => version.validFrom <= input.date)
    .at(-1);
  const cycle = input.cycleId
    ? profile.cycles.find((item) => item.id === input.cycleId)
    : profile.cycles.find(
        (item) =>
          item.openedAt <= input.date &&
          (!item.closedAt || item.closedAt >= input.date),
      );
  return {
    raftId: profile.id,
    date: input.date,
    layoutVersion: layout?.version ?? null,
    cycle: cycle ? { ...cycle } : null,
    lanes: (layout?.lanes ?? []).map((lane) => {
      const sources = events.filter(
        (event) =>
          event.cycleId === cycle?.id &&
          event.laneNumber === lane.number &&
          event.date <= input.date,
      );
      return {
        ...lane,
        portions: lanePortions(lane.length, sources),
        planned: sources
          .filter(
            (event) =>
              event.kind === "planned" &&
              event.to > event.from &&
              event.to > 0 &&
              event.from < lane.length,
          )
          .map((event) => ({
            ...event,
            from: Math.max(0, event.from),
            to: Math.min(lane.length, event.to),
          })),
      };
    }),
  };
}
