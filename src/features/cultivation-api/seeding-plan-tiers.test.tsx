// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, summary, settings } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), summary: vi.fn(), settings: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycleSummary: summary }));
vi.mock("@/features/input-items/repository", () => ({ inputRepository: { settings } }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, seedRepo: { read, write }, useAllowed: () => () => true };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { SeedingForm } from "./records-seeding-form";
import { seedingPlanOf } from "./use-seeding-plan";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const lotId = "00000000-0000-4000-8000-000000000011", cycleId = "00000000-0000-4000-8000-000000000022";
const seedData = { cycleId, raftId: "r", raftCode: "B1", seedingCompletedOn: null, laneCount: 2, seededCount: 0, notSeededLanes: [1, 2], canRecord: true, canMarkComplete: false, lanes: [{ laneNumber: 1, canSeed: true }], records: [], lots: [], cycleRowVersion: "v" };
const lot = { id: lotId, code: "PN1-1", receiptCode: "PN1", supplierName: "NCC", unit: "con", itemName: "Giống hàu", quantityReceived: 1000, quantitySeeded: 0, boughtForThisRaft: true, onHand: 600 };

describe("seeding vs plan tiers (pure)", () => {
  it("normal up to 110%, a reason above, refused above 150%", () => {
    expect(seedingPlanOf(0, 100, "110")).toMatchObject({ percent: 110, soft: false, hard: false });
    expect(seedingPlanOf(0, 100, "111")).toMatchObject({ soft: true, hard: false });
    expect(seedingPlanOf(0, 100, "150")).toMatchObject({ soft: true, hard: false });
    expect(seedingPlanOf(0, 100, "151")).toMatchObject({ soft: false, hard: true });
  });
  it("adds the seed already hung, leaves a corrected session's own quantity out, and judges nothing without a plan", () => {
    expect(seedingPlanOf(80, 100, "20")).toMatchObject({ total: 100, percent: 100 });
    expect(seedingPlanOf(80, 100, "30", 20)).toMatchObject({ total: 90, percent: 90 });
    expect(seedingPlanOf(80, null, "999")).toMatchObject({ planned: null, percent: undefined, soft: false, hard: false });
  });
});

async function mount(over: { onHand?: number; planned?: number | null; hung?: number; allowNegative?: boolean } = {}) {
  read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [{ ...lot, onHand: over.onHand ?? lot.onHand }] } });
  summary.mockResolvedValue({ status: "success", data: { seedHung: over.hung ?? 80, expectedSeedQuantity: over.planned === undefined ? 100 : over.planned, seedUnit: "con" } });
  settings.mockResolvedValue({ status: "success", data: { costMethod: "Fixed", allowNegativeQuantity: over.allowNegative ?? true, rowVersion: "v" } });
  const onSaved = vi.fn();
  render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId={cycleId} data={seedData} record={null} allowed={() => true} onClose={vi.fn()} onSaved={onSaved} /></ToastProvider>);
  await screen.findByRole("option", { name: /PN1-1/ });
  fireEvent.change(screen.getByLabelText("Lô giống *"), { target: { value: lotId } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Làn 1" }));
  return onSaved;
}
const type = (value: string) => fireEvent.change(screen.getByLabelText("Số lượng giống *"), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

describe("seeding form against the plan", () => {
  it("shows hung / plan / percent with a bar and no yellow 'Vượt kế hoạch... Hãy kiểm tra' line", async () => {
    await mount(); type("40");
    expect(await screen.findByText("Giống đã thả 120 / kế hoạch 100 con (120%) nếu lưu lần thả này.")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: /Giống đã thả/ })).toBeTruthy();
    expect(screen.queryByText(/Hãy kiểm tra lại số liệu đã nhập/)).toBeNull();
  });
  it("saves directly at or under 110%", async () => {
    write.mockResolvedValue({ status: "success", data: { record: { id: lotId } } });
    await mount(); type("30"); save();
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][1]).not.toHaveProperty("confirmOverPlan");
  });
  it("above 110% asks inline for a reason with explicit choices and sends nothing until confirmed", async () => {
    await mount(); type("40"); save();
    const block = await screen.findByRole("alert", { name: "Xác nhận vượt kế hoạch" });
    expect(block.textContent).toContain("120%");
    expect(write).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Xác nhận vượt kế hoạch" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sửa lại số liệu" }));
    await waitFor(() => expect(screen.queryByRole("alert", { name: "Xác nhận vượt kế hoạch" })).toBeNull());
  });
  it("sends confirmOverPlan with the reason once confirmed", async () => {
    write.mockResolvedValue({ status: "success", data: { record: { id: lotId } } });
    const onSaved = await mount(); type("40"); save();
    fireEvent.change(await screen.findByLabelText("Lý do vượt kế hoạch *"), { target: { value: "Thả thêm vì hao" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận vượt kế hoạch" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(write.mock.calls[0][1]).toMatchObject({ quantity: 40, confirmOverPlan: true, overPlanReason: "Thả thêm vì hao" });
  });
  it("refuses above 150% and disables the save", async () => {
    await mount(); type("80");
    expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
    save();
    expect(write).not.toHaveBeenCalled();
  });
  it("answers a backend 409 over-plan question with the same inline block", async () => {
    write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-04", uncertain: false, problem: { code: "MSG-GEN-04", confirmFlag: "confirmOverPlan" } });
    await mount({ planned: null }); type("10"); save();
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect(await screen.findByRole("alert", { name: "Xác nhận vượt kế hoạch" })).toBeTruthy();
  });
});

describe("seeding form against the stock", () => {
  it("limits the quantity to the lot on hand when negative stock is not allowed and refuses a larger one", async () => {
    await mount({ allowNegative: false, planned: null, onHand: 50 }); type("60");
    expect(await screen.findByText(/Không được vượt tồn kho/)).toBeTruthy();
    save();
    expect(screen.getByText("Tối đa 50 con.")).toBeTruthy();
    expect(write).not.toHaveBeenCalled();
  });
  it("only warns while negative stock is allowed", async () => {
    await mount({ planned: null, onHand: 50 }); type("60");
    expect(await screen.findByText(/Số nhập đang lớn hơn tồn kho/)).toBeTruthy();
  });
});
