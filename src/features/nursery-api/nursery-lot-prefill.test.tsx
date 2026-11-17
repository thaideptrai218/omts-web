// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const state = vi.hoisted(() => ({ lots: vi.fn() }));
vi.mock("./service", async (original) => ({ ...(await original<typeof import("./service")>()), nurseryService: { lots: state.lots, save: vi.fn() } }));
vi.mock("@/features/cultivation-api/record-crew-picker", () => ({ RecordCrewPicker: () => null }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { NurseryStartDialog } from "./nursery-start-dialog";

const zone = "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", lotA = "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0a", lotB = "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0b";
const zones = [{ id: zone, code: "V01", name: "Vùng 1", statusId: 101 }] as never;
const lot = (id: string, code: string) => ({ id, code, receiptCode: "PN000004", supplierName: "Trại giống", unit: "mảnh", itemName: "Hàu giống", onHand: 100 });

beforeEach(() => { state.lots.mockResolvedValue({ status: "success", data: { lots: [lot(lotA, "PN000004-1"), lot(lotB, "PN000004-2")] } }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = (initialLotId?: string) => render(<ToastProvider><NurseryStartDialog zones={zones} initialZone={zone} initialLotId={initialLotId} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);

it("starts the nursery form with the lot of the link chosen", async () => {
  open(lotB);
  const select = await screen.findByLabelText("Lô giống trong kho") as HTMLSelectElement;
  await waitFor(() => expect(select.querySelector(`option[value="${lotB}"]`)).toBeTruthy());
  expect(select.value).toBe(lotB);
  expect(screen.getByText("Tồn kho của lô: 100 mảnh")).toBeTruthy();
});

it("starts with no lot chosen without a link, and when the zone offers no such lot", async () => {
  open();
  const select = await screen.findByLabelText("Lô giống trong kho") as HTMLSelectElement;
  await waitFor(() => expect(select.querySelector(`option[value="${lotA}"]`)).toBeTruthy());
  expect(select.value).toBe("");
  cleanup();
  open("0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0bff");
  const other = await screen.findByLabelText("Lô giống trong kho") as HTMLSelectElement;
  await waitFor(() => expect(other.querySelector(`option[value="${lotA}"]`)).toBeTruthy());
  expect(other.value).toBe("");
});
