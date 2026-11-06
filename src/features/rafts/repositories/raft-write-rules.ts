import { vietnameseBusinessDate } from "@/shared/format/date-only";
import type {
  RaftFailure,
  RaftProfile,
  RaftRecord,
  SaveRaftInput,
} from "../domain/raft";
import { raftSchema } from "../schemas/raft-schema";

export function updatedRaft(
  record: RaftRecord | undefined,
  input: SaveRaftInput,
  actorId: string,
): { profile: RaftProfile } | RaftFailure {
  const parsed = raftSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "invalid",
      fields: [
        ...new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
      ],
    };
  const values = parsed.data;
  const current = record?.profile;
  const previous = current?.layouts.at(-1);
  const changed =
    !!previous &&
    JSON.stringify(previous.lanes) !== JSON.stringify(values.lanes);
  if (changed && current?.cycles.some((cycle) => !cycle.closedAt))
    return { status: "open-cycle" };
  const removedInUse = [
    ...new Set(
      record?.events
        .filter((event) => event.laneNumber > values.lanes.length)
        .map((event) => event.laneNumber) ?? [],
    ),
  ];
  if (removedInUse.length)
    return { status: "lanes-in-use", laneNumbers: removedInUse };
  const today = vietnameseBusinessDate();
  const nextLayout = {
    version: (previous?.version ?? 0) + 1,
    validFrom: today,
    validTo: null,
    lanes: values.lanes,
  };
  return {
    profile: {
      id: current?.id ?? crypto.randomUUID(),
      zoneId: current?.zoneId ?? values.zoneId,
      code: values.code,
      latitude: Number(values.latitude.replace(",", ".")),
      longitude: Number(values.longitude.replace(",", ".")),
      location: values.location,
      size: values.size,
      conditionNotes: values.conditionNotes,
      status: current?.status ?? "in-use",
      createdBy: current?.createdBy ?? actorId,
      recordVersion: crypto.randomUUID(),
      layouts: !previous
        ? [nextLayout]
        : changed
          ? [
              ...current!.layouts.map((layout) =>
                layout.version === previous.version
                  ? { ...layout, validTo: today }
                  : layout,
              ),
              nextLayout,
            ]
          : current!.layouts,
      cycles: current?.cycles ?? [],
      materialCostVnd: current?.materialCostVnd ?? null,
      photoFileName: current?.photoFileName ?? null,
    },
  };
}

export async function validRaftPhoto(file: File): Promise<boolean> {
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) return false;
  if (!["image/jpeg", "image/png"].includes(file.type)) return false;
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signature =
    file.type === "image/png"
      ? [137, 80, 78, 71, 13, 10, 26, 10]
      : [255, 216, 255];
  return signature.every((byte, i) => bytes[i] === byte);
}
