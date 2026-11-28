// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ list: vi.fn(), exportList: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner", username: "chu" }, permissions: { functionPermissions: [] } }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/products/repository", async (original) => ({
  ...(await original<typeof import("@/features/products/repository")>()),
  disposalRepository: { list: state.list, exportList: state.exportList },
  productRepository: { all: vi.fn(async () => ({ status: "success", data: [] })) },
}));
vi.mock("@/features/zones-api/in-use-zones", async () => (await import("@/test/header-zone-rows")).inUseZonesMock);
import { DisposalsScreen } from "./disposals-screen";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

const show = () => render(<HeaderZones><DisposalsScreen /></HeaderZones>);
const last = () => state.list.mock.calls.at(-1)![0] as Record<string, string>;
beforeEach(() => { chooseHeaderZones([]); state.exportList.mockResolvedValue({ status: "success", data: undefined }); state.list.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 10, total: 0, summary: { totalKg: 0 } } }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

// The zone filter of the disposal list is the header zone chip, so the list, the file and the chip always name the same zones.
it("follows the header zones both ways and sends them as one comma list", async () => {
  show();
  await waitFor(() => expect(state.list).toHaveBeenCalled());
  const zone = () => screen.getByLabelText("Vùng") as HTMLSelectElement;
  expect(zone().selectedOptions[0].textContent).toBe("Tất cả vùng nuôi");
  expect(last().zoneIds).toBeUndefined();
  fireEvent.change(zone(), { target: { value: headerZoneIds[1] } });
  await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[1], page: "1" }));
  expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "ids", ids: [headerZoneIds[1]] });
  expect(last().zoneId).toBeUndefined();
});

it("opens on a header subset and sends the same zones with the file", async () => {
  chooseHeaderZones([headerZoneIds[0], headerZoneIds[2]]);
  show();
  await waitFor(() => expect(last().zoneIds).toBe(`${headerZoneIds[0]},${headerZoneIds[2]}`));
  expect((screen.getByLabelText("Vùng") as HTMLSelectElement).selectedOptions[0].textContent).toBe("2 vùng đã chọn");
  fireEvent.click(screen.getByRole("button", { name: /Xuất file/ }));
  await waitFor(() => expect(state.exportList).toHaveBeenCalledWith(expect.objectContaining({ zoneIds: `${headerZoneIds[0]},${headerZoneIds[2]}` })));
});
