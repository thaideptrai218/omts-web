import type { LanePortion, LaneState, RaftEvent } from "./raft";

function stateOf(sources: readonly RaftEvent[]): LaneState {
  const finished = sources
    .filter(
      (event) => event.kind === "harvested" || event.kind === "written-off",
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (finished)
    return finished.kind === "harvested" ? "harvested" : "written-off";
  return sources.some((event) => event.kind === "seeded")
    ? "growing"
    : "unseeded";
}

// Metres from marker A. Planned harvest is an overlay, never actual progress.
export function lanePortions(
  length: number,
  events: readonly RaftEvent[],
): readonly LanePortion[] {
  if (!Number.isFinite(length) || length <= 0) return [];
  const relevant = events
    .filter(
      (event) =>
        event.kind !== "planned" &&
        Number.isFinite(event.from) &&
        Number.isFinite(event.to),
    )
    .map((event) => ({
      event,
      from: Math.max(0, event.from),
      to: Math.min(length, event.to),
    }))
    .filter((event) => event.to > event.from);
  const cuts = [
    ...new Set([
      0,
      length,
      ...relevant.flatMap((event) => [event.from, event.to]),
    ]),
  ].sort((a, b) => a - b);
  const portions: LanePortion[] = [];
  for (let index = 0; index < cuts.length - 1; index++) {
    const from = cuts[index],
      to = cuts[index + 1];
    const sources = relevant
      .filter((event) => event.from <= from && event.to >= to)
      .map((item) => ({ ...item.event }));
    const state = stateOf(sources);
    const previous = portions.at(-1);
    if (
      previous?.state === state &&
      previous.sources.map((event) => event.id).join() ===
        sources.map((event) => event.id).join()
    ) {
      portions[portions.length - 1] = { ...previous, to };
    } else portions.push({ from, to, state, sources });
  }
  return portions;
}
