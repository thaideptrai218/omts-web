// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ cages: vi.fn(), addCage: vi.fn(), updateCage: vi.fn(), removeCage: vi.fn(), weigh: vi.fn() }));
vi.mock("./repository", () => ({ lotRepository: repo }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { LotWeighForm, weighComparison } from "./lot-weigh-form";

const p1 = "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", p2 = "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", lotId = "122bb318-a72e-49aa-a8d7-a6169f889007";
const cageId = (n: number) => `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d1b0${n}`;
const product = (id: string, name: string) => ({ productId: id, productCode: name.slice(0, 3), productName: name, harvestedCages: 4, weighedCages: 0, cagesKg: 0, weighedKg: null });
const cage = (n: number, kg: number, productId = p1) => ({ id: cageId(n), number: n, productId, kg, weighedAt: "2026-11-17T09:00:00+07:00" });
const sheet = (patch: object = {}) => ({ lotId, lotCode: "LTH000007", statusId: 2904, status: "AwaitingWeighing", rowVersion: "v1", harvestedCages: 4, estimatedKg: 200, cages: [], products: [product(p1, "Hàu sữa")],
  cagesKg: 0, weighedKg: null, weighedAt: null, needsCompleting: false, canEdit: true, orderCodes: [], traderName: null, traderCages: [], traderCagesKg: null, agreement: null, needsAgreement: false, canAgree: false, ...patch });
const ok = (data: unknown) => ({ status: "success", data });
const lot = { id: lotId, lotCode: "LTH000007", raftCode: "B1", harvestedAt: "2026-11-17T08:00:00+07:00", cageCount: 4, estimatedKg: 200, rowVersion: "v1", productLines: [{ productId: p1, productName: "Hàu sữa" }] } as never;
const mount = (onSaved = vi.fn()) => render(<ToastProvider><LotWeighForm lot={lot} zoneId="z" onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);

beforeAll(() => {
  // jsdom has no <dialog> modal API; the confirmation dialog only needs it to open and close.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
beforeEach(() => { repo.cages.mockResolvedValue(ok(sheet())); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const next = () => screen.findByLabelText(/Kg của lồng tiếp theo/) as Promise<HTMLInputElement>;
const type = (input: HTMLInputElement, value: string) => { fireEvent.change(input, { target: { value } }); fireEvent.submit(input.closest("form")!); };

it("says no cage is weighed yet, with the big next-cage field ready", async () => {
  mount();
  expect(await screen.findByText("Chưa cân lồng nào")).toBeTruthy();
  expect((await next()).inputMode).toBe("decimal");
  expect((screen.getByRole("button", { name: /^Hoàn tất/ }) as HTMLButtonElement).disabled).toBe(true);
});

it("adds a cage typed with a comma, empties the field and keeps the focus there", async () => {
  repo.addCage.mockResolvedValue(ok(sheet({ cages: [cage(1, 12.5)], needsCompleting: true })));
  mount();
  const input = await next();
  type(input, "12,5");
  await waitFor(() => expect(repo.addCage).toHaveBeenCalledWith(lotId, "z", { kg: 12.5, clientOperationId: expect.stringMatching(/^[0-9a-f-]{36}$/) }));
  expect(await screen.findByText("Lồng")).toBeTruthy();
  await waitFor(() => expect(input.value).toBe(""));
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(screen.getAllByText("12,5").length).toBeGreaterThan(0);
  expect((screen.getByRole("button", { name: /^Hoàn tất/ }) as HTMLButtonElement).disabled).toBe(false);
});

it.each([["0", "lớn hơn 0"], ["1,2345", "3 số lẻ"], ["abc", "số kg"], ["-4", "số kg"]])("sends nothing for %s", async (value, message) => {
  mount();
  type(await next(), value);
  expect((await screen.findByRole("alert")).textContent?.toLowerCase()).toContain(message);
  expect(repo.addCage).not.toHaveBeenCalled();
});

it("sends the same operation id again when an answer was lost, and a new one for another weight", async () => {
  repo.addCage.mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: true }).mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: true }).mockResolvedValue(ok(sheet({ cages: [cage(1, 9)] })));
  mount();
  const input = await next();
  type(input, "9");
  expect((await screen.findByRole("alert")).textContent).toContain("bấm lại để gửi");
  expect(input.value).toBe("9");
  type(input, "9");
  await waitFor(() => expect(repo.addCage).toHaveBeenCalledTimes(2));
  type(input, "8");
  await waitFor(() => expect(repo.addCage).toHaveBeenCalledTimes(3));
  const ids = repo.addCage.mock.calls.map((call) => call[2].clientOperationId);
  expect(ids[0]).toBe(ids[1]);
  expect(ids[2]).not.toBe(ids[0]);
});

it("asks which product when the lot has several, and sends it", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ products: [product(p1, "Hàu sữa"), product(p2, "Hàu cồn")] })));
  repo.addCage.mockResolvedValue(ok(sheet({ products: [product(p1, "Hàu sữa"), product(p2, "Hàu cồn")], cages: [cage(1, 5, p2)] })));
  mount();
  const input = await next();
  fireEvent.change(screen.getByLabelText("Sản phẩm của lồng"), { target: { value: p2 } });
  type(input, "5");
  await waitFor(() => expect(repo.addCage).toHaveBeenCalledWith(lotId, "z", expect.objectContaining({ kg: 5, productId: p2 })));
});

it("shows the running total, the sum per product and the difference with the estimate", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ products: [product(p1, "Hàu sữa"), product(p2, "Hàu cồn")], cages: [cage(1, 90), cage(2, 100.5, p2)], needsCompleting: true })));
  mount();
  expect(await screen.findByLabelText("Tổng đã cân 190,5 kg")).toBeTruthy();
  const per = within(screen.getByRole("list", { name: "Tổng theo sản phẩm" }));
  expect(per.getByText(/Hàu sữa: 1/).parentElement?.textContent).toContain("90 kg");
  expect(per.getByText(/Hàu cồn: 1/).parentElement?.textContent).toContain("100,5 kg");
  expect(screen.getByLabelText("So sánh với số mang lên").textContent).toContain("−9,5 kg (−4,7%)");
});

it("corrects a cage in place and saves it by its id", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ cages: [cage(1, 12), cage(2, 13)], needsCompleting: true })));
  repo.updateCage.mockResolvedValue(ok(sheet({ cages: [cage(1, 12), cage(2, 14)], needsCompleting: true })));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Sửa lồng số 2" }));
  const input = screen.getByLabelText("Kg lồng số 2") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "14" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(repo.updateCage).toHaveBeenCalledWith(lotId, "z", { cageId: cageId(2), kg: 14 }));
  await waitFor(() => expect(screen.queryByLabelText("Kg lồng số 2")).toBeNull());
});

it("removes a cage only after the confirmation", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ cages: [cage(1, 12)], needsCompleting: true })));
  repo.removeCage.mockResolvedValue(ok(sheet()));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Xóa lồng số 1" }));
  expect(repo.removeCage).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: /Xác nhận|Đồng ý|Xóa$/ }));
  await waitFor(() => expect(repo.removeCage).toHaveBeenCalledWith(lotId, "z", cageId(1)));
  expect(await screen.findByText("Chưa cân lồng nào")).toBeTruthy();
});

it("completes from the cages with the version of the sheet and tells the screen", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ harvestedCages: 2, cages: [cage(1, 90), cage(2, 100.5)], needsCompleting: true })));
  repo.weigh.mockResolvedValue(ok({ lot: {} }));
  const onSaved = vi.fn();
  mount(onSaved);
  fireEvent.click(await screen.findByRole("button", { name: "Hoàn tất · 190,5 kg" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(repo.weigh).toHaveBeenCalledWith(lotId, "z", { rowVersion: "v1" });
});

it("warns before completing with fewer cages than were harvested", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ harvestedCages: 4, cages: [cage(1, 90)], needsCompleting: true })));
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /^Hoàn tất/ }));
  expect(await screen.findByText(/Mới cân 1 trên 4 lồng/)).toBeTruthy();
  expect(repo.weigh).not.toHaveBeenCalled();
});

it("keeps the sheet and says why in Vietnamese when the lot is closed meanwhile", async () => {
  repo.addCage.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
  mount();
  type(await next(), "10");
  expect((await screen.findByRole("alert")).textContent).toContain("Lô đã đóng");
});

it("shows the sheet read only when the API says the caller cannot edit, or the lot is closed", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ canEdit: false, cages: [cage(1, 12)], weighedKg: 12, weighedAt: "2026-11-17T09:00:00+07:00" })));
  mount();
  expect(await screen.findByText("Bạn chỉ xem được phiếu cân của lô này.")).toBeTruthy();
  expect(screen.queryByLabelText(/Kg của lồng tiếp theo/)).toBeNull();
  expect(screen.queryByRole("button", { name: /Sửa lồng|Xóa lồng|^Hoàn tất/ })).toBeNull();
  cleanup();
  repo.cages.mockResolvedValue(ok(sheet({ statusId: 2903, status: "Closed", cages: [cage(1, 12)] })));
  mount();
  expect(await screen.findByText("Lô đã đóng, phiếu cân chỉ để xem.")).toBeTruthy();
  expect(screen.queryByLabelText(/Kg của lồng tiếp theo/)).toBeNull();
});

it("shows the trader's cages beside ours, highlights the difference and waits for the agreement", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ cages: [cage(1, 12), cage(2, 13)], traderName: "Anh Bảy", traderCages: [{ id: cageId(5), number: 1, kg: 12 }, { id: cageId(6), number: 2, kg: 12.5 }], traderCagesKg: 24.5, needsAgreement: true, weighedKg: 25, weighedAt: "2026-11-17T09:30:00+07:00" })));
  mount();
  expect(await screen.findByRole("columnheader", { name: "Thương lái cân" })).toBeTruthy();
  expect(screen.getByText("Khớp")).toBeTruthy();
  expect(within(screen.getByRole("table")).getByText(/−0,5/).className).toContain("text-danger");
  expect(screen.getByText("Chờ thương lái đồng ý")).toBeTruthy();
});

it("shows when the trader agreed", async () => {
  repo.cages.mockResolvedValue(ok(sheet({ cages: [cage(1, 12)], traderName: "Anh Bảy", traderCages: [{ id: cageId(5), number: 1, kg: 12 }], traderCagesKg: 12, agreement: { agreedAt: "2026-11-17T10:00:00+07:00", agreedKg: 12 }, weighedKg: 12, weighedAt: "2026-11-17T09:30:00+07:00" })));
  mount();
  expect((await screen.findByText(/Thương lái đã đồng ý lúc 17\/11\/2026 10:00/)).textContent).toContain("12 kg");
});

it("offers a way to retry when the sheet cannot be loaded", async () => {
  repo.cages.mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại phiếu cân" }));
  expect(await next()).toBeTruthy();
});

it("compares the weighed kg with the estimate of the cages brought up", () => {
  expect(weighComparison(200, 190)).toEqual({ difference: -10, percent: -5 });
  expect(weighComparison(0, 10)).toEqual({ difference: 10, percent: null });
});
