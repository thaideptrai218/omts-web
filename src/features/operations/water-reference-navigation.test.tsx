// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ids, waterFixture } from "./__tests__/fixtures";
const state = vi.hoisted(() => ({ query: "", read: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: state.read }) }));
vi.mock("./lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [{ id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", code: "QA01", name: "Vùng QA" }] })) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./water-measurement-panel", () => ({ WaterMeasurementPanel: ({ id }: { id: string }) => <p>Đang mở {id}</p> }));
vi.mock("@/features/water-overview/water-zone-overview", () => ({ WaterZoneOverview: () => null }));
import { WaterScreen } from "./water-screen";
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); HTMLElement.prototype.scrollIntoView = vi.fn(); });
it("opens an older linked measurement and replaces it on navigation within the water screen", async () => {
  const first = waterFixture({ measuredAt: "2020-01-05T08:00:00+07:00" });
  const second = waterFixture({ id: "11111111-1111-4111-8111-111111111111", measuredAt: "2021-02-06T08:00:00+07:00" });
  state.read.mockImplementation(async (action: string, query: Record<string, string>) => {
    const record = query.id === second.id || query.from === "2021-02-06" ? second : first;
    return { status: "success", data: action === "detail" ? record : { items: [{ ...record, valuesOutside: [] }], total: 1, page: 1, pageSize: 100 } };
  });
  state.query = `zoneId=${ids.zone}&recordId=${first.id}`;
  const view = render(<ToastProvider><WaterScreen /></ToastProvider>);
  await screen.findByText(`Đang mở ${first.id}`);
  await waitFor(() => expect(state.read).toHaveBeenCalledWith("list", expect.objectContaining({ from: "2020-01-05", to: "2020-01-05" }), expect.anything(), expect.any(AbortSignal)));
  state.query = `zoneId=${ids.zone}&recordId=${second.id}`;
  view.rerender(<ToastProvider><WaterScreen /></ToastProvider>);
  await screen.findByText(`Đang mở ${second.id}`);
  expect(screen.queryByText(`Đang mở ${first.id}`)).toBeNull();
  await waitFor(() => expect(state.read).toHaveBeenCalledWith("list", expect.objectContaining({ from: "2021-02-06", to: "2021-02-06" }), expect.anything(), expect.any(AbortSignal)));
});
