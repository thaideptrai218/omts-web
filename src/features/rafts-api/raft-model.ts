import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { createWorkspaceRepository, type WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { foldVietnamese } from "@/shared/presentation/fold-text";

export const IN_USE = 101, DISCONTINUED = 102;
export const raftStatusLabel = (statusId: number) => statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng";
export const laneStatusLabel = (statusId: number) => statusId === 2001 ? "Đang sử dụng" : statusId === 2002 ? "Đã gỡ" : "Không xác định";
const text = z.string(), nullableText = text.nullable();
const raftRowSchema = z.object({ id: apiIdSchema, code: text, statusId: z.number().int(), status: text, laneCount: z.number().int().optional(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional() });
const raftDetailSchema = raftRowSchema.extend({ location: nullableText, size: nullableText, conditionNotes: nullableText, rowVersion: text.min(1),
  lanes: z.array(z.object({ id: apiIdSchema, laneNumber: z.number().int(), statusId: z.number().int(), status: text })) });
export type RaftRow = z.infer<typeof raftRowSchema>;
export type RaftDetail = z.infer<typeof raftDetailSchema>;

const invalid = { status: "error", httpStatus: 502, uncertain: false } as const;
/** The raft list is per zone and arrives whole, so search, filter, sort and paging run over the full set on the client. */
export async function readZoneRafts(zoneId: string, signal: AbortSignal): Promise<WorkspaceResult<RaftRow[]>> {
  const result = await loadOptions("rafts", signal, { zoneId });
  if (result.status !== "success") return result;
  const parsed = z.array(raftRowSchema).safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
}
export async function readRaftDetail(id: string, signal?: AbortSignal): Promise<WorkspaceResult<RaftDetail>> {
  const result = await createWorkspaceRepository("rafts").detail(id, signal);
  if (result.status !== "success") return result;
  const parsed = raftDetailSchema.safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
}
export const parseRaftDetail = (value: unknown): RaftDetail | undefined => {
  const parsed = raftDetailSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export type RaftSortKey = "code" | "lanes" | "status";
export type RaftFilters = { search: string; statusId: string };
export const emptyRaftFilters: RaftFilters = { search: "", statusId: "" };
export function filterRafts(rows: readonly RaftRow[], filters: RaftFilters): RaftRow[] {
  const term = foldVietnamese(filters.search.trim());
  return rows.filter(row => (!filters.statusId || String(row.statusId) === filters.statusId) && (!term || foldVietnamese(row.code).includes(term)));
}
export function sortRafts(rows: readonly RaftRow[], key: RaftSortKey, direction: "asc" | "desc"): RaftRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const order = key === "lanes" ? (a.laneCount ?? 0) - (b.laneCount ?? 0) : key === "status" ? a.statusId - b.statusId : 0;
    return sign * (order || a.code.localeCompare(b.code, "vi", { numeric: true }));
  });
}

export type RaftDraft = Record<"code" | "location" | "size" | "latitude" | "longitude" | "conditionNotes" | "laneCount", string>;
export type RaftField = keyof RaftDraft;
export const emptyRaftDraft: RaftDraft = { code: "", location: "", size: "", latitude: "", longitude: "", conditionNotes: "", laneCount: "1" };
const asText = (value: string | number | null | undefined) => value === null || value === undefined ? "" : String(value);
export const raftDraftOf = (raft: RaftDetail): RaftDraft => ({ code: raft.code, location: asText(raft.location), size: asText(raft.size), latitude: asText(raft.latitude), longitude: asText(raft.longitude),
  conditionNotes: asText(raft.conditionNotes), laneCount: asText(raft.laneCount ?? raft.lanes.length) });
const toNumber = (value: string) => Number(value.trim().replace(",", "."));

/** Backend permits no location, or a complete coordinate pair; lane count remains a positive integer. */
export function validateRaftDraft(draft: RaftDraft): Partial<Record<RaftField, string>> {
  const errors: Partial<Record<RaftField, string>> = {};
  if (!draft.code.trim()) errors.code = "Nhập mã bè.";
  if (!draft.size.trim()) errors.size = "Nhập kích thước.";
  for (const [key, min, max, label] of [["latitude", -90, 90, "vĩ độ"], ["longitude", -180, 180, "kinh độ"]] as const) {
    const value = toNumber(draft[key]);
    if (!draft.latitude.trim() && !draft.longitude.trim()) continue;
    if (!draft[key].trim()) errors[key] = `Chọn đầy đủ vị trí trên bản đồ (${label}).`;
    else if (!Number.isFinite(value) || value < min || value > max) errors[key] = `Nhập số từ ${min} đến ${max}.`;
  }
  const lanes = Number(draft.laneCount);
  if (!Number.isInteger(lanes) || lanes < 1) errors.laneCount = "Số làn phải là số nguyên từ 1 trở lên.";
  return errors;
}
export function raftBody(draft: RaftDraft, rowVersion?: string): Record<string, unknown> {
  const body: Record<string, unknown> = { code: draft.code.trim(), latitude: draft.latitude.trim() ? toNumber(draft.latitude) : null, longitude: draft.longitude.trim() ? toNumber(draft.longitude) : null, size: draft.size.trim(),
    location: draft.location.trim() || null, conditionNotes: draft.conditionNotes.trim() || null, laneCount: Number(draft.laneCount) };
  if (rowVersion) body.rowVersion = rowVersion;
  return body;
}
