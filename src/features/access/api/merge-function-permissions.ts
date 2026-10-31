import type { FunctionPermission } from "@/features/access/domain/function-permission";

export function mergeFunctionPermissions(entries: readonly FunctionPermission[]): readonly FunctionPermission[] {
  const merged = new Map<string, FunctionPermission>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.functionCode, entry.action, entry.dataScope]);
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, entry);
    } else if (previous.scope.kind === "all-zones" || entry.scope.kind === "all-zones") {
      merged.set(key, { ...entry, scope: { kind: "all-zones" } });
    } else {
      merged.set(key, {
        ...entry,
        scope: { kind: "zones", zoneIds: [...new Set([...previous.scope.zoneIds, ...entry.scope.zoneIds])] },
      });
    }
  }
  return [...merged.values()];
}
