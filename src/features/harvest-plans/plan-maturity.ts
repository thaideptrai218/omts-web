import type { EligibleRaft } from "./contracts";

/**
 * When a raft can be harvested and whether a product can be had now or later. The API sends `expectedHarvestDate` (the start of the cycle plus the days the seed needs
 * to mature, "yyyy-MM-dd", null when no seed gives the days); everything here is worked out from it at read time, in the business calendar of Vietnam.
 */
const DAY_MS = 86_400_000;

/** Today in Vietnam as "yyyy-MM-dd". */
export const todayInVietnam = (now: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
/** "dd/mm/yyyy" of a "yyyy-MM-dd" date. */
export const viDate = (date: string) => date.split("-").reverse().join("/");
/** "dd/mm" of a "yyyy-MM-dd" date. */
export const viDayMonth = (date: string) => date.split("-").reverse().slice(0, 2).join("/");
/** Whole days from one "yyyy-MM-dd" date to another (negative when `to` is before `from`). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export type Readiness = { state: "ready" } | { state: "waiting"; daysLeft: number } | { state: "unknown" };
/** Ready from the expected date on; waiting before it (with the days left); unknown when the seed has no days to maturity. */
export function readiness(expectedHarvestDate: string | null | undefined, today: string = todayInVietnam()): Readiness {
  if (!expectedHarvestDate) return { state: "unknown" };
  const left = daysBetween(today, expectedHarvestDate);
  return left <= 0 ? { state: "ready" } : { state: "waiting", daysLeft: left };
}

/** "Dự kiến thu hoạch từ 27/10/2026 · đã sẵn sàng" or "… · chưa đủ ngày (còn 45 ngày)"; says so when the seed has no days to maturity. */
export function readinessText(raft: Pick<EligibleRaft, "expectedHarvestDate">, today?: string): string {
  const status = readiness(raft.expectedHarvestDate, today);
  if (status.state === "unknown" || !raft.expectedHarvestDate) return "Chưa có thời gian trưởng thành của giống";
  return `Dự kiến thu hoạch từ ${viDate(raft.expectedHarvestDate)} · ${status.state === "ready" ? "đã sẵn sàng" : `chưa đủ ngày (còn ${status.daysLeft} ngày)`}`;
}

/** The warning (never a block) when the plan harvests a raft before its oysters are expected to be ready; `plannedDate` is "yyyy-MM-dd". */
export function earlyHarvestWarning(raft: Pick<EligibleRaft, "raftCode" | "expectedHarvestDate">, plannedDate: string): string | undefined {
  if (!raft.expectedHarvestDate) return undefined;
  const early = daysBetween(plannedDate, raft.expectedHarvestDate);
  return early > 0 ? `Bè ${raft.raftCode}: ngày thu hoạch dự kiến sớm hơn ngày hàu đủ tuổi ${viDate(raft.expectedHarvestDate)} (sớm ${early} ngày). Bạn vẫn có thể lưu.` : undefined;
}

export type Availability = { state: "now" } | { state: "soon"; date: string } | { state: "none" };
/** Whether a product can be had now (some raft farming it is ready) or from the earliest expected date; none when no raft with a known date farms it. */
export function productAvailability(rafts: readonly EligibleRaft[], productId: string, today?: string): Availability {
  const dates = rafts.filter((raft) => raft.product?.id === productId && raft.expectedHarvestDate).map((raft) => raft.expectedHarvestDate!).sort();
  if (!dates.length) return { state: "none" };
  return readiness(dates[0], today).state === "ready" ? { state: "now" } : { state: "soon", date: dates[0] };
}
/** "Có sẵn" or "Sắp có – dự kiến 27/10"; undefined when nothing is known. */
export const availabilityText = (availability: Availability): string | undefined =>
  availability.state === "now" ? "Có sẵn" : availability.state === "soon" ? `Sắp có – dự kiến ${availability.date.split("-").reverse().join("/")}` : undefined;
