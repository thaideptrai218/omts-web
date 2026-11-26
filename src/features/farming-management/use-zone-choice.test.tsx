// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

const lookups = vi.hoisted(() => ({ loadOptions: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("zoneId=00000000-0000-4000-8000-000000000002") }));
vi.mock("@/features/operations/lookups", () => lookups);
import { useZoneChoice } from "./use-zone-choice";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const zone = (n: number, statusId: number) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, code: `V0${n}`, name: `Vùng ${n}`, location: null, area: null, statusId, status: statusId === 101 ? "In Use" : "Discontinued", inUseRaftCount: 0, licenseState: null });

it("offers In Use zones only and falls back to the first one when a link names a discontinued zone", async () => {
  lookups.loadOptions.mockResolvedValue({ status: "success", data: [zone(1, 101), zone(2, 102), zone(3, 101)] });
  const { result } = renderHook(() => useZoneChoice());
  await waitFor(() => expect(result.current.zones.length).toBe(2));
  expect(lookups.loadOptions).toHaveBeenCalledWith("zones", expect.anything(), { statusId: "101" });
  expect(result.current.zones.map(row => row.code)).toEqual(["V01", "V03"]);
  expect(result.current.zoneId).toBe(zone(1, 101).id);
});
