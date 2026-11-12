// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const repo = vi.hoisted(() => ({ readCycles: vi.fn(), readCycleSummary: vi.fn(), readClosePreview: vi.fn(), closeCycle: vi.fn() }));
vi.mock("./repository", () => repo);
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { CycleJourneyTab } from "./cycle-journey-tab";
import { buildJourney, currentStep, type JourneyInput } from "./cycle-journey-model";
import type { CycleFigures } from "./close-contracts";
import type { CycleView } from "./cycle-model";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const raftId = "00000000-0000-4000-8000-0000000000a1", cycleId = "00000000-0000-4000-8000-0000000000c1", zoneId = "00000000-0000-4000-8000-000000000001";
const cycle = (patch: Partial<CycleView> = {}): CycleView => ({ id: cycleId, startDate: "2026-10-02", closeDate: null, statusId: 1, status: "Open", rowVersion: "AAAA", raftId, raftCode: "B1-01", expectedSeedQuantity: 250, targetYieldKg: 8500,
  seedingCompletedOn: null, assessment: null, closedEarly: false, daysOfFarming: 41, canEdit: true, canCancel: false, ...patch });
const figures = (patch: Partial<CycleFigures> = {}): CycleFigures => ({ cycleId, raftCode: "B1-01", startDate: "2026-10-02", closeDate: null, asOf: "2026-11-12", seedingSessionCount: 2, seedHung: 5000, seedUnit: "con", harvestLotCount: 3, kgHarvested: 580,
  lastHarvestDate: "2026-11-11", daysOfFarming: 41, expectedSeedQuantity: 250, targetYieldKg: 8500, closedEarly: false, earlyReason: null, notHarvestedLanes: [], assessment: null, harvestedCages: 12, remainingKg: 7920, ...patch });
const lanes = (...states: string[]) => states.map((state, index) => ({ laneNumber: index + 1, state }));
const input = (patch: Partial<JourneyInput> = {}): JourneyInput => ({ cycle: cycle(), lanes: lanes("Growing", "BeingHarvested", "Harvested"), figures: figures(), today: "2026-11-12", canClose: true, canEditPlan: true, canLog: true, canRecord: true, ...patch });
const step = (steps: ReturnType<typeof buildJourney>, key: string) => steps.find(entry => entry.key === key)!;

describe("journey model: five steps, plan vs actual, one primary action each", () => {
  it("lists Kế hoạch, Thả giống, Chăm sóc, Thu hoạch, Tổng kết in order with plan vs actual bars", () => {
    const steps = buildJourney(input());
    expect(steps.map(entry => entry.key)).toEqual(["plan", "seeding", "care", "harvest", "summary"]);
    expect(step(steps, "seeding").bars[0]).toMatchObject({ actual: 5000, plan: 250, unit: "con" });
    expect(step(steps, "harvest").bars[0]).toMatchObject({ actual: 580, plan: 8500, unit: "kg", estimate: true });
    expect(step(steps, "plan").lines.join(" ")).not.toContain("Ngày thu dự kiến");
  });
  it("sends each step to the right place with a distinct key", () => {
    const steps = buildJourney(input({ cycle: cycle({ seedingCompletedOn: null }), lanes: lanes("NotSeeded", "Growing") }));
    expect(step(steps, "seeding").action).toMatchObject({ key: "journey-seeding-record", label: "Ghi nhận thả giống", screen: "seeding" });
    expect(buildJourney(input({ lanes: lanes("Growing", "Growing") })).find(entry => entry.key === "seeding")!.action).toMatchObject({ key: "journey-seeding-complete", label: "Hoàn tất thả giống" });
    expect(step(buildJourney(input({ cycle: cycle({ seedingCompletedOn: "2026-11-11" }) })), "seeding").action).toBeUndefined();
    expect(step(steps, "care").action).toMatchObject({ tab: "logs" });
    expect(step(buildJourney(input()), "harvest").action).toMatchObject({ key: "journey-harvest", screen: "harvest", label: "Thu hoạch và hoàn tất làn" });
    expect(step(buildJourney(input({ lanes: lanes("Growing") })), "harvest").action).toMatchObject({ label: "Ghi nhận thu hoạch" });
    const keys = steps.flatMap(entry => entry.action ? [entry.action.key] : []);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("invites the plan only when nothing is planned, and closes only when allowed", () => {
    expect(step(buildJourney(input({ cycle: cycle({ expectedSeedQuantity: null, targetYieldKg: null }), figures: figures({ expectedSeedQuantity: null, targetYieldKg: null }) })), "plan").action).toMatchObject({ tab: "plan" });
    expect(step(buildJourney(input()), "plan").action).toBeUndefined();
    expect(step(buildJourney(input({ canClose: false })), "summary").action).toBeUndefined();
  });
  it("marks the summary ready when every seeded lane is harvested and warns of an early close otherwise", () => {
    const ready = buildJourney(input({ lanes: lanes("Harvested", "Harvested", "NotSeeded") }));
    expect(step(ready, "harvest").status).toBe("done"); expect(step(ready, "summary")).toMatchObject({ status: "active", chip: "Sẵn sàng kết thúc", action: { close: true } });
    expect(currentStep(ready)).toBe("seeding");
    const early = buildJourney(input({ figures: figures({ notHarvestedLanes: [1, 3] }) }));
    expect(step(early, "summary").lines.join(" ")).toContain("Còn làn 1, 3 chưa thu xong");
  });
  it("shows a closed cycle as done with no action", () => {
    const closed = buildJourney(input({ cycle: cycle({ closeDate: "2026-11-12", assessment: "Tốt" }), figures: figures({ closeDate: "2026-11-12" }) }));
    expect(closed.every(entry => entry.status === "done" && !entry.action)).toBe(true);
    expect(step(closed, "summary").lines.join(" ")).toContain("Đánh giá: Tốt");
  });
});

const access = { view: true, create: true, edit: true, remove: true, logs: true, logsCreate: true, logsEdit: true };
const row = { raftId, raftCode: "B1-01", raftStatusId: 101, raftStatus: "In Use", laneCount: 3, cycle: { id: cycleId, startDate: "2026-10-02", closeDate: null, statusId: 1, status: "Open", rowVersion: "AAAA" }, lastCloseDate: null, canStart: false, canEdit: true, canCancel: false };
const preview = (patch: object = {}) => ({ summary: figures({ notHarvestedLanes: [1] }), isEarly: true, needsOwnerApproval: false, earlyCloseMessage: "Early", confirmMessage: "Sure?", cycleRowVersion: "AAAA", ...patch });
function mount(part: "overview" | "summary" = "overview", onJump = vi.fn(), onChanged = vi.fn()) {
  repo.readCycles.mockResolvedValue({ status: "success", data: { raftId, raftCode: "B1-01", date: "2026-11-12", cycle: cycle(), lanes: [{ id: cycleId, laneNumber: 1, statusId: 1, status: "x", state: "Growing" }, { id: cycleId, laneNumber: 2, statusId: 1, status: "x", state: "BeingHarvested" }], notSeededLanes: [] } });
  repo.readCycleSummary.mockResolvedValue({ status: "success", data: figures({ notHarvestedLanes: [1, 2] }) });
  render(<ToastProvider><CycleJourneyTab part={part} row={row} zoneId={zoneId} access={access} onJump={onJump} onChanged={onChanged} /></ToastProvider>);
  return { onJump, onChanged };
}

describe("journey tab", () => {
  it("renders the stepper with status chips and jumps to the care-log tab from its action", async () => {
    const { onJump } = mount("overview");
    const list = await screen.findByRole("list", { name: "Hành trình chu kỳ" });
    expect(within(list).getAllByRole("heading", { level: 4 }).map(heading => heading.textContent)).toEqual(["✓Kế hoạch", "2Thả giống", "3Thu hoạch"]);
    const optional = screen.getByRole("complementary", { name: "Hoạt động tùy chọn" });
    expect(optional.textContent).toContain("Chăm sóc");
    expect(optional.textContent).toContain("Vật tư");
    expect(within(list).getByRole("progressbar", { name: /Giống đã thả/ })).toBeTruthy();
    fireEvent.click(within(optional).getByRole("button", { name: "Ghi nhật ký chăm sóc" }));
    expect(onJump).toHaveBeenCalledWith("logs");
    expect(within(list).getByRole("link", { name: "Thu hoạch và hoàn tất làn" }).getAttribute("href")).toBe(`/operations/harvest?zoneId=${zoneId}&raftId=${raftId}&cycleId=${cycleId}`);
  });
  it("puts the figures at a glance above the cards and keeps the closing step for the Tổng kết tab", async () => {
    mount("overview");
    const figuresRow = await screen.findByRole("list", { name: "Hành trình chu kỳ" }).then(() => screen.getByLabelText("Tiến độ chính của đợt nuôi"));
    expect(within(figuresRow).getByText("Ươm giống").nextElementSibling?.textContent).toBe("Không qua ươm");
    expect(within(figuresRow).getByText("Đợt nuôi").nextElementSibling?.textContent).toContain("Ngày");
    expect(within(figuresRow).getByText("Thả giống")).toBeTruthy();
    expect(within(figuresRow).getByText("Thu hoạch")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kết thúc chu kỳ" })).toBeNull();
  });
  it("shows only the closing step with its action in the summary part", async () => {
    mount("summary");
    const list = await screen.findByRole("list", { name: "Tổng kết chu kỳ" });
    expect(within(list).getAllByRole("heading", { level: 4 }).map(heading => heading.textContent)).toEqual(["4Tổng kết"]);
    expect(screen.queryByLabelText("Tiến độ chính của đợt nuôi")).toBeNull();
    expect(screen.queryByRole("complementary", { name: "Hoạt động tùy chọn" })).toBeNull();
  });
  it("closes directly for the Owner: preview, required assessment, one confirmation, toast", async () => {
    repo.readClosePreview.mockResolvedValue({ status: "success", data: preview() });
    repo.closeCycle.mockResolvedValue({ status: "success", data: { cycle: cycle({ closeDate: "2026-11-12" }), summary: figures() } });
    const { onChanged } = mount("summary");
    fireEvent.click(await screen.findByRole("button", { name: "Kết thúc chu kỳ" }));
    const form = await screen.findByRole("form", { name: "Kết thúc chu kỳ" });
    expect(within(form).queryByRole("checkbox")).toBeNull();
    expect(within(form).getByText(/Kết thúc sớm: còn làn 1 chưa thu xong/)).toBeTruthy();
    fireEvent.click(within(form).getByRole("button", { name: "Kết thúc chu kỳ" }));
    expect(await within(form).findByText("Nhập đánh giá chu kỳ trước khi kết thúc.")).toBeTruthy();
    expect(repo.closeCycle).not.toHaveBeenCalled();
    fireEvent.change(within(form).getByLabelText("Đánh giá chu kỳ *"), { target: { value: "Đạt 7% mục tiêu" } });
    fireEvent.click(within(form).getByRole("button", { name: "Kết thúc chu kỳ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("Đã kết thúc chu kỳ."));
    expect(repo.closeCycle).toHaveBeenCalledWith(cycleId, { assessment: "Đạt 7% mục tiêu", rowVersion: "AAAA" });
    expect(await screen.findByText("Đã kết thúc chu kỳ của bè B1-01.")).toBeTruthy();
  });
  it("makes a Zone Manager confirm the Owner's approval of an early close and sends ownerApproved", async () => {
    repo.readClosePreview.mockResolvedValue({ status: "success", data: preview({ needsOwnerApproval: true }) });
    repo.closeCycle.mockResolvedValue({ status: "success", data: { cycle: cycle({ closeDate: "2026-11-12" }), summary: figures() } });
    mount("summary");
    fireEvent.click(await screen.findByRole("button", { name: "Kết thúc chu kỳ" }));
    const form = await screen.findByRole("form", { name: "Kết thúc chu kỳ" });
    fireEvent.change(within(form).getByLabelText("Đánh giá chu kỳ *"), { target: { value: "Sớm vì dịch" } });
    fireEvent.click(within(form).getByRole("button", { name: "Kết thúc chu kỳ" }));
    expect((await within(form).findByRole("alert")).textContent).toContain("cần Chủ hợp tác xã đồng ý");
    expect(repo.closeCycle).not.toHaveBeenCalled();
    fireEvent.click(within(form).getByRole("checkbox"));
    fireEvent.click(within(form).getByRole("button", { name: "Kết thúc chu kỳ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(repo.closeCycle).toHaveBeenCalledWith(cycleId, { assessment: "Sớm vì dịch", rowVersion: "AAAA", ownerApproved: true }));
  });
  it("answers a MSG-CYCLE-07 from the backend by asking for the approval instead of showing an error", async () => {
    repo.readClosePreview.mockResolvedValue({ status: "success", data: preview({ needsOwnerApproval: false }) });
    repo.closeCycle.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false, problem: { code: "MSG-CYCLE-07", confirmFlag: "ownerApproved" } });
    mount("summary");
    fireEvent.click(await screen.findByRole("button", { name: "Kết thúc chu kỳ" }));
    const form = await screen.findByRole("form", { name: "Kết thúc chu kỳ" });
    fireEvent.change(within(form).getByLabelText("Đánh giá chu kỳ *"), { target: { value: "Sớm" } });
    fireEvent.click(within(form).getByRole("button", { name: "Kết thúc chu kỳ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect(await within(form).findByRole("checkbox")).toBeTruthy();
    expect(within(form).queryByText(/Dữ liệu đã thay đổi/)).toBeNull();
  });
  it("shows the load error with a retry", async () => {
    repo.readCycles.mockResolvedValue({ status: "error", httpStatus: 500, uncertain: false });
    repo.readCycleSummary.mockResolvedValue({ status: "error", httpStatus: 500, uncertain: false });
    render(<ToastProvider><CycleJourneyTab part="overview" row={row} zoneId={zoneId} access={access} onJump={vi.fn()} onChanged={vi.fn()} /></ToastProvider>);
    expect(await screen.findByRole("button", { name: "Tải lại hành trình" })).toBeTruthy();
  });
  it("explains a raft without a cycle", () => {
    render(<ToastProvider><CycleJourneyTab part="overview" row={{ ...row, cycle: null }} zoneId={zoneId} access={access} onJump={vi.fn()} onChanged={vi.fn()} /></ToastProvider>);
    expect(screen.getByText(/Bè chưa có chu kỳ nuôi/)).toBeTruthy();
  });
});
