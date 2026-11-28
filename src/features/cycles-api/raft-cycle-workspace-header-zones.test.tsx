// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
// Full list rows: the workspace reads the zones through the zone contract as well as the header.
vi.mock("@/features/zones-api/in-use-zones", async () => {
  const { headerZones } = await import("@/test/header-zone-rows");
  return { loadInUseZones: async () => ({ status: "success", data: headerZones.map(zone => ({ ...zone, location: null, area: null, inUseRaftCount: 1, licenseState: null })) }) };
});
import { RaftCycleWorkspace } from "./raft-cycle-workspace";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

const loadRows = vi.fn(async () => ({ status: "success" as const, data: [] }));
const show = () => render(<ToastProvider><HeaderZones><RaftCycleWorkspace storageKey="cycles" icon="raft" title="Chu kỳ nuôi" area="cultivation-cycles" loadRows={loadRows} renderDetail={() => null} /></HeaderZones></ToastProvider>);
beforeEach(() => chooseHeaderZones([]));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

// A screen that works on one zone at a time offers the header zones only, shows the current one, and a pick narrows the header.
it("offers only the header zones, shows the current one and narrows the header when another is picked", async () => {
  chooseHeaderZones([headerZoneIds[1], headerZoneIds[2]]);
  show();
  const select = await screen.findByLabelText("Vùng nuôi") as HTMLSelectElement;
  await waitFor(() => expect([...select.options].map(option => option.textContent)).toEqual(["Z2 · Minh Châu", "Z3 · Quan Lạn"]));
  expect(select.value).toBe(headerZoneIds[1]);
  await waitFor(() => expect(loadRows).toHaveBeenCalledWith(headerZoneIds[1], expect.anything()));
  fireEvent.change(select, { target: { value: headerZoneIds[2] } });
  await waitFor(() => expect(loadRows).toHaveBeenCalledWith(headerZoneIds[2], expect.anything()));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[2]] });
  expect((screen.getByLabelText("Vùng nuôi") as HTMLSelectElement).value).toBe(headerZoneIds[2]);
});
