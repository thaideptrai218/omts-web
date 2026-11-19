// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const { weigh } = vi.hoisted(() => ({ weigh: vi.fn() }));
vi.mock("./repository", () => ({ lotRepository: { weigh } }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { LotWeighForm } from "./lot-weigh-form";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const product = (n: number) => ({ productId: `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0${n}`, productCode: `SP${n}`, productName: n === 1 ? "Hàu sữa" : "Hàu cồn", cageCount: 2, kg: 100 });
const lot = (patch: object = {}) => ({ id: "122bb318-a72e-49aa-a8d7-a6169f889007", lotCode: "LTH000007", harvestedAt: "2026-11-17T08:00:00+07:00", estimatedKg: 200, rowVersion: "v1", productLines: [product(1), product(2)], weighedKg: null, ...patch }) as never;
const mount = (value = lot(), onSaved = vi.fn()) => render(<ToastProvider><LotWeighForm lot={value} zoneId="z" onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);

it("asks one weighed kg per product line, with the estimate beside it, and sends them by line number", async () => {
  weigh.mockResolvedValue({ status: "success", data: { lot: {} } });
  const onSaved = vi.fn();
  mount(lot(), onSaved);
  expect(screen.getAllByText(/Mang lên 2 lồng/)).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Kg cân Hàu sữa"), { target: { value: "98,125" } });
  fireEvent.change(screen.getByLabelText("Kg cân Hàu cồn"), { target: { value: "90" } });
  expect(screen.getByText("188,125 kg")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Lưu số cân" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(weigh).toHaveBeenCalledWith("122bb318-a72e-49aa-a8d7-a6169f889007", "z", { rowVersion: "v1", lines: [{ lineNumber: 1, weighedKg: 98.125 }, { lineNumber: 2, weighedKg: 90 }] });
});

it("keeps the time out of the request until it is changed, so the API takes now", async () => {
  weigh.mockResolvedValue({ status: "success", data: { lot: {} } });
  mount(lot({ productLines: [] }));
  fireEvent.change(screen.getByLabelText("Kg cân thực tế"), { target: { value: "55.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu số cân" }));
  await waitFor(() => expect(weigh).toHaveBeenCalled());
  expect(weigh.mock.calls[0][2]).toEqual({ rowVersion: "v1", lines: [], weighedKg: 55.5 });
});

it("sends nothing while a kg is empty or zero", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Kg cân Hàu sữa"), { target: { value: "10" } });
  // The empty required field stops the submit in the browser.
  fireEvent.click(screen.getByRole("button", { name: "Lưu số cân" }));
  expect(weigh).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Kg cân Hàu cồn"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu số cân" }));
  expect(weigh).not.toHaveBeenCalled();
});

it("shows the previous weighing when weighing again and starts from its kg", async () => {
  weigh.mockResolvedValue({ status: "success", data: { lot: {} } });
  mount(lot({ weighedKg: 190, weighedAt: "2026-11-17T09:00:00+07:00", weighedByName: "Chủ", productLines: [{ ...product(1), weighedKg: 190 }] }));
  expect(screen.getByText(/Lần cân trước/).textContent).toContain("190 kg");
  expect(screen.getByText(/Lần cân trước/).textContent).toContain("17/11/2026 09:00");
  expect((screen.getByLabelText("Kg cân Hàu sữa") as HTMLInputElement).value).toBe("190");
  
  fireEvent.change(screen.getByLabelText("Kg cân Hàu sữa"), { target: { value: "185" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu số cân mới" }));
  await waitFor(() => expect(weigh).toHaveBeenCalled());
  expect(weigh.mock.calls[0][2].lines).toEqual([{ lineNumber: 1, weighedKg: 185 }]);
});

it("keeps the form and shows the refusal of the API", async () => {
  weigh.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
  const onSaved = vi.fn();
  mount(lot({ productLines: [] }), onSaved);
  fireEvent.change(screen.getByLabelText("Kg cân thực tế"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu số cân" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Trạng thái hiện tại không cho phép");
  expect(onSaved).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Kg cân thực tế") as HTMLInputElement).value).toBe("10");
});

it("compares the weighed kg with the estimate of the cages brought up", async () => {
  const { weighComparison } = await import("./lot-weigh-form");
  expect(weighComparison(200, 190)).toEqual({ difference: -10, percent: -5 });
  expect(weighComparison(0, 10)).toEqual({ difference: 10, percent: null });
});
