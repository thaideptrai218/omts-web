// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const state = vi.hoisted(() => ({ detail: vi.fn(), assign: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), planRepository: { detail: state.detail, assign: state.assign } }));
vi.mock("@/features/products/lot-link", async () => {
  const { lotHref } = await import("@/features/products/product-helpers");
  return { LotLink: ({ code }: { code: string }) => <a href={lotHref(code)}>{code}</a> };
});
import { ToastProvider } from "@/components/ui/toast-provider";
import type { PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { PlanDetailPanel } from "./plan-detail";

const owner = { create: true, edit: true, remove: true, harvest: true, staff: true } as PlanAccess;
const lane = (laneNumber: number, state: string, lotCode: string | null = null) => ({ laneId: id(60 + laneNumber), laneNumber, state, lotCode });
const view = (patch: object = {}) => ({
  id: id(1), code: "KHT000005", statusId: 4202, status: "Assigned", zones: [{ id: id(6), code: "DEMO-01", name: "Vùng demo" }], plannedAt: "2026-11-18T06:00:00+07:00", note: "ghi chú kế hoạch",
  createdBy: { id: id(8), name: "Nguyễn Văn Hải" }, assignedAt: "2026-11-18T01:17:00+07:00", completedAt: null, cancelledAt: null, cancelReason: null,
  orders: [{ id: id(9), code: "DH000005" }],
  lines: [{ id: id(2), lineNumber: 1, raftId: id(4), raftCode: "B1-01", zone: { id: id(6), code: "DEMO-01", name: "Vùng demo" }, note: null, lanes: [lane(3, "Harvested", "DEMO-01-B1-01-20261118")], expectedProduct: { id: id(10), code: "SP000001", name: "Hàu sữa" }, expectedCageCount: 2.5, state: "Harvested", canHarvest: false, lot: { id: id(11), lotCode: "DEMO-01-B1-01-20261118" } }],
  progress: { lines: 1, linesDone: 1, lanes: 1, lanesHarvested: 1, lanesSkipped: 0 }, allowedActions: ["Edit", "Assign", "Cancel"], createdAt: "2026-11-12T08:00:00+07:00", rowVersion: "p1", executor: "ZoneManager", ...patch,
}) as unknown as PlanView;
const open = async (plan: PlanView, access = owner) => {
  state.detail.mockResolvedValue({ status: "success", data: plan });
  render(<ToastProvider><PlanDetailPanel id={plan.id} access={access} onChanged={vi.fn()} /></ToastProvider>);
  return screen.findByRole("heading", { name: plan.code });
};

// jsdom has no <dialog> modal methods.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { state.detail.mockReset(); state.assign.mockReset(); });
afterEach(cleanup);

it("lays the plan out like the invoice row: facts, linked lines, note and sums", async () => {
  await open(view());
  const facts = screen.getByText("Thời gian dự kiến:").parentElement!.parentElement!;
  expect(within(facts).getByRole("link", { name: "DEMO-01" }).getAttribute("href")).toBe(`/farming/zones?recordId=${id(6)}&search=DEMO-01`);
  expect(within(facts).getByRole("link", { name: "DH000005" }).getAttribute("href")).toContain("DH000005");
  expect(within(facts).getByText("Nguyễn Văn Hải")).toBeTruthy();
  expect(within(facts).getByText("Hoàn thành lúc:")).toBeTruthy();
  const table = screen.getByRole("table", { name: "Dòng của kế hoạch thu hoạch" });
  expect(within(table).getByRole("link", { name: "B1-01" }).getAttribute("href")).toBe(`/farming/rafts?zoneId=${id(6)}&recordId=${id(4)}&search=B1-01`);
  expect(within(table).getByRole("link", { name: "Hàu sữa (SP000001)" }).getAttribute("href")).toBe("/sales/products?code=SP000001");
  expect(within(table).getAllByRole("link", { name: "DEMO-01-B1-01-20261118" })).not.toHaveLength(0);
  expect((screen.getByRole("textbox", { name: "Ghi chú" }) as HTMLTextAreaElement).value).toBe("ghi chú kế hoạch");
  expect((screen.getByRole("textbox", { name: "Ghi chú" }) as HTMLTextAreaElement).readOnly).toBe(true);
  const sums = screen.getByRole("textbox", { name: "Ghi chú" }).nextElementSibling as HTMLElement;
  for (const [label, value] of [["Số bè", "1"], ["Lồng dự kiến", "2,5"], ["Đã thu", "1/1 bè"]]) {
    expect(within(sums).getByText(label).nextElementSibling!.textContent).toBe(value);
  }
});

it("puts Sao chép and Hủy kế hoạch on the left and Chỉnh sửa, Phân công on the right, as the API allows", async () => {
  await open(view());
  const [left, right] = [...document.querySelectorAll("footer > div")];
  expect([...left.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Sao chép", "Hủy kế hoạch"]);
  expect([...right.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Chỉnh sửa", "Phân công"]);
  cleanup();
  await open(view({ allowedActions: [] }), { ...owner, create: false });
  expect(screen.queryByRole("button", { name: "Hủy kế hoạch" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Sao chép" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
});

it("shows when and why a cancelled plan was cancelled instead of the completion time", async () => {
  await open(view({ statusId: 4205, status: "Cancelled", cancelledAt: "2026-11-19T09:30:00+07:00", cancelReason: "Mưa bão", allowedActions: [] }));
  expect(screen.getByText("Hủy lúc:")).toBeTruthy();
  expect(screen.getByText("Mưa bão")).toBeTruthy();
  expect(screen.queryByText("Hoàn thành lúc:")).toBeNull();
});

const zoneAccess = { owner: false, create: false, edit: false, remove: false, harvest: true, staff: true } as PlanAccess;
const ownerAccess = { ...owner, owner: true } as PlanAccess;
const buttons = () => [...document.querySelectorAll("footer button")].map((button) => button.textContent);

it("shows Nhận kế hoạch to the zone manager of an Assigned plan, with the status and the hint", async () => {
  await open(view({ allowedActions: ["Receive"] }), zoneAccess);
  expect(buttons()).toEqual(["Nhận kế hoạch"]);
  expect(screen.getByText("Đã giao QLV")).toBeTruthy();
  expect(screen.getByTestId("plan-next-step").textContent).toContain("Cần nhận");
});

it("shows Bàn giao cho chủ only when the API allows HandOver", async () => {
  await open(view({ statusId: 4203, status: "Harvesting", allowedActions: ["Harvest", "HandOver"] }), zoneAccess);
  expect(buttons()).toEqual(["Bàn giao cho chủ"]);
  cleanup();
  await open(view({ statusId: 4203, status: "Harvesting", allowedActions: ["Harvest"] }), zoneAccess);
  expect(buttons()).toEqual([]);
});

it("shows Hoàn thành to the Owner of a HandedOver plan with the check-then-complete hint, and the Received and HandedOver labels", async () => {
  await open(view({ statusId: 4207, status: "HandedOver", allowedActions: ["Finish", "Edit"] }), ownerAccess);
  expect(buttons()).toEqual(expect.arrayContaining(["Hoàn thành"]));
  expect(buttons()).not.toContain("Kết thúc");
  expect(screen.getByText("Đã bàn giao")).toBeTruthy();
  expect(screen.getByTestId("plan-next-step").textContent).toBe("Quản lý vùng đã bàn giao, kiểm tra rồi bấm Hoàn thành.");
  cleanup();
  await open(view({ statusId: 4206, status: "Received", allowedActions: [] }), ownerAccess);
  expect(screen.getByText("Đã nhận")).toBeTruthy();
  expect(buttons()).not.toContain("Hoàn thành");
});

const draft = (patch: object = {}) => view({ statusId: 4201, status: "Draft", allowedActions: ["Edit", "Assign", "Cancel"], ...patch });

it("asks who harvests at Phân công: the zone manager by default, the Owner on choice, sent with the assignment", async () => {
  const user = userEvent.setup();
  state.assign.mockResolvedValue({ status: "success", data: {} });
  await open(draft(), ownerAccess);
  await user.click(screen.getByRole("button", { name: "Phân công" }));
  const manager = screen.getByRole("radio", { name: /Giao quản lý vùng/ }) as HTMLInputElement;
  expect(manager.checked).toBe(true);
  expect(screen.getByText("Chủ ghi thu hoạch và hoàn thành, không qua quản lý vùng.")).toBeTruthy();
  await user.click(screen.getByRole("radio", { name: /Chủ tự làm/ }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Phân công" }));
  await waitFor(() => expect(state.assign).toHaveBeenCalledWith(id(1), "p1", "Owner"));
});

it("keeps the zone manager as the default executor when the dialog is confirmed untouched", async () => {
  const user = userEvent.setup();
  state.assign.mockResolvedValue({ status: "success", data: {} });
  await open(draft(), ownerAccess);
  await user.click(screen.getByRole("button", { name: "Phân công" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Phân công" }));
  await waitFor(() => expect(state.assign).toHaveBeenCalledWith(id(1), "p1", "ZoneManager"));
});

it("walks an Owner plan: hint and buttons come from the API, no Receive or HandOver, the executor is shown", async () => {
  await open(view({ executor: "Owner", allowedActions: ["Edit", "Cancel", "Harvest", "SkipLane"] }), ownerAccess);
  expect(screen.getByTestId("plan-next-step").textContent).toBe("Chủ tự thu hoạch: ghi lô thu hoạch cho từng bè trong kế hoạch.");
  expect(screen.getByText("Người thực hiện:").nextElementSibling!.textContent).toBe("Chủ tự làm");
  expect(buttons()).not.toEqual(expect.arrayContaining(["Nhận kế hoạch", "Bàn giao cho chủ", "Hoàn thành"]));
  cleanup();
  await open(view({ executor: "Owner", statusId: 4203, status: "Harvesting", allowedActions: ["Edit", "Finish"] }), ownerAccess);
  expect(screen.getByTestId("plan-next-step").textContent).toContain("bấm Hoàn thành");
  expect(buttons()).toEqual(expect.arrayContaining(["Hoàn thành"]));
  expect(buttons()).not.toContain("Nhận kế hoạch");
});
