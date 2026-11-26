// @vitest-environment jsdom
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { ReadOnlyZonesProvider, useZoneActionBlocked, useZoneReadOnly } from "./read-only-zones";

const wrap = ({ children }: { children: ReactNode }) => <ReadOnlyZonesProvider value={new Set(["old"])}>{children}</ReadOnlyZonesProvider>;

it("refuses writes in a read-only zone but still allows viewing and exporting", () => {
  const { result } = renderHook(() => useZoneActionBlocked("old"), { wrapper: wrap });
  for (const action of ["Create", "Edit", "Delete", "LogsCreate", "LogsEdit", "AttendanceCreate"]) expect(result.current(action)).toBe(true);
  for (const action of ["View", "LogsView", "Export"]) expect(result.current(action)).toBe(false);
});
it("blocks nothing in any other zone or outside a provider", () => {
  expect(renderHook(() => useZoneActionBlocked("live"), { wrapper: wrap }).result.current("Create")).toBe(false);
  expect(renderHook(() => useZoneActionBlocked("old")).result.current("Edit")).toBe(false);
  expect(renderHook(() => useZoneReadOnly("old"), { wrapper: wrap }).result.current).toBe(true);
});
