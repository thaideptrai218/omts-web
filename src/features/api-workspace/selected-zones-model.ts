export type ZoneOption = Readonly<{ id: string; name: string }>;
/** `all` follows every visible zone, including ones added later; `ids` pins a subset. */
export type StoredZoneSelection = Readonly<{ kind: "all" } | { kind: "ids"; ids: readonly string[] }>;
export type ResolvedZoneSelection = Readonly<{ selectedIds: readonly string[]; allSelected: boolean }>;

const storageKey = (accountId: string) => `omts.selected-zones.v1.${accountId}`;

export function readStoredZoneSelection(accountId: string): StoredZoneSelection | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(accountId));
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return undefined;
    const record = value as { kind?: unknown; ids?: unknown };
    if (record.kind === "all") return { kind: "all" };
    if (record.kind === "ids" && Array.isArray(record.ids) && record.ids.every((id) => typeof id === "string")) return { kind: "ids", ids: record.ids };
  } catch { /* storage unavailable or corrupt: behave as if nothing was saved */ }
  return undefined;
}

export function writeStoredZoneSelection(accountId: string, selection: StoredZoneSelection): void {
  try { globalThis.localStorage?.setItem(storageKey(accountId), JSON.stringify(selection)); } catch { /* private mode or quota: the choice just lasts this session */ }
}

/** Drops zones the user can no longer see; an empty or missing choice means every zone. */
export function resolveZoneSelection(zones: readonly ZoneOption[], stored: StoredZoneSelection | undefined): ResolvedZoneSelection {
  const every = zones.map((zone) => zone.id);
  if (!stored || stored.kind === "all") return { selectedIds: every, allSelected: true };
  const pinned = new Set(stored.ids);
  const kept = every.filter((id) => pinned.has(id));
  return !kept.length || kept.length === every.length ? { selectedIds: every, allSelected: true } : { selectedIds: kept, allSelected: false };
}

/** Flips one zone. The last remaining zone cannot be removed, so the selection never ends up empty. */
export function toggleZoneSelection(zones: readonly ZoneOption[], current: ResolvedZoneSelection, zoneId: string): StoredZoneSelection {
  const picked = new Set(current.selectedIds);
  if (picked.has(zoneId)) { if (picked.size === 1) return current.allSelected ? { kind: "all" } : { kind: "ids", ids: [...picked] }; picked.delete(zoneId); } else picked.add(zoneId);
  const ids = zones.map((zone) => zone.id).filter((id) => picked.has(id));
  return ids.length === zones.length ? { kind: "all" } : { kind: "ids", ids };
}

/** "Tất cả khu nuôi", one name, "A và B", or "A và N khu khác". */
export function zoneSelectionLabel(zones: readonly ZoneOption[], selection: ResolvedZoneSelection): string {
  if (selection.allSelected) return "Tất cả khu nuôi";
  const names = zones.filter((zone) => selection.selectedIds.includes(zone.id)).map((zone) => zone.name);
  if (names.length <= 1) return names[0] ?? "Tất cả khu nuôi";
  return names.length === 2 ? `${names[0]} và ${names[1]}` : `${names[0]} và ${names.length - 1} khu khác`;
}
