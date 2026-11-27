import type { z } from "zod";
import type { cycleProgress } from "@/features/cycles-api/contracts";
import type { CultivationLog } from "@/features/cycles-api/log-contracts";
import type { seedingList } from "@/features/cultivation-api/records-contracts";

/** Live state of a raft = today's lane progress of its open cycle (the same read the Hành trình screen uses) plus the seeding sessions of that cycle. */
export type LiveProgress = z.infer<typeof cycleProgress>;
export type LiveLane = LiveProgress["lanes"][number];
export type SeedingData = z.infer<typeof seedingList>;
export type SeedingRecord = SeedingData["records"][number];

const REMOVED_LANE = 2002;
/** A removed lane (status 2002) is no longer part of the raft: it is never counted nor listed. */
export const keptLanes = (lanes: readonly LiveLane[]) => lanes.filter(lane => lane.statusId !== REMOVED_LANE);

/** Lanes of the raft record (physical facts such as the line length) overlaid with today's progress (state, seeded and harvested %), lane by lane. */
export function mergeLiveLanes<L extends { laneNumber: number }>(base: readonly L[], live?: readonly LiveLane[]): (L & Partial<LiveLane>)[] {
  const byNumber = new Map((live ?? []).map(lane => [lane.laneNumber, lane] as const));
  return base.map(lane => ({ ...lane, ...byNumber.get(lane.laneNumber) }));
}

const dayMs = 86_400_000;
export const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / dayMs));

export type LaneSeedFacts = { seeds: string[]; firstDate?: string; lastDate?: string; days?: number; sessions: number };
/** What was hung on one lane: the seed names, first and last seeding date, and how many days the oldest seed has been farmed. */
export function laneSeedFacts(records: readonly SeedingRecord[], laneNumber: number, today: string): LaneSeedFacts {
  const sessions = records.filter(record => record.laneNumbers.includes(laneNumber)), dates = sessions.map(record => record.seedingDate).sort();
  const seeds = [...new Set(sessions.map(record => record.seedLot.itemName?.trim()).filter((name): name is string => !!name))];
  return { seeds, sessions: sessions.length, ...(dates.length ? { firstDate: dates[0], lastDate: dates[dates.length - 1], days: daysBetween(dates[0], today) } : {}) };
}

export type GalleryPhoto = { id: string; url: string; source: string; date?: string; caption: string; raftPhotoId?: string; sortOrder?: number };
const photoDate = (value?: string) => value ? value.slice(0, 10) : undefined;
/** Raft photos plus the photos of the seeding sessions and care logs of the open cycle; the dated ones newest first, the undated raft photos after them. */
export function buildGallery(input: { raftCode: string; zoneId?: string; raftPhotos: readonly { id: string; url: string; sortOrder: number }[]; records?: readonly SeedingRecord[]; logs?: readonly CultivationLog[] }): GalleryPhoto[] {
  // The backend's signed file links are not reachable from the browser: the BFF photo routes of seeding records and care logs stream them (index = position in the record).
  const zone = encodeURIComponent(input.zoneId ?? "");
  const dated: GalleryPhoto[] = [
    ...(input.records ?? []).flatMap(record => record.photos.map((photo, index) => ({ id: `seed-${record.id}-${photo.id}`, url: `/api/operations/seeding?action=photo&id=${record.id}&zoneId=${zone}&index=${index}`, source: "Thả giống", date: record.seedingDate, caption: `Thả giống ngày ${photoDate(record.seedingDate)}` }))),
    ...(input.logs ?? []).flatMap(log => log.photos.map((photo, index) => ({ id: `log-${log.id}-${photo.key}`, url: `/api/operations/cultivation-cycles?action=log-photo&id=${log.id}&zoneId=${zone}&index=${index}`, source: "Nhật ký chăm sóc", date: log.visitDate, caption: `Chăm sóc ngày ${photoDate(log.visitDate)}` }))),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const own = input.raftPhotos.map(photo => ({ id: `raft-${photo.id}`, url: photo.url, source: "Ảnh bè", raftPhotoId: photo.id, sortOrder: photo.sortOrder, caption: `Ảnh ${photo.sortOrder} của bè ${input.raftCode}` }));
  return [...dated, ...own];
}
