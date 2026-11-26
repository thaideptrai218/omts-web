// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as baseRender, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn(), download: vi.fn() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("./lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [] })) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { MeasurementEditor, NewMeasurement } from "./water-screen";
import { ids, waterFixture } from "./__tests__/fixtures";
const render = (ui: ReactNode) => baseRender(<ToastProvider>{ui}</ToastProvider>);

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "confirm").mockReturnValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("tester workflow safeguards", () => {
  it("keeps a chosen measurement photo until explicit discard", async () => {
    const onClose = vi.fn();
    render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={onClose} onSaved={vi.fn()} />);
    const picker = screen.getByLabelText("Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)");
    await userEvent.upload(picker, new File(["png"], "qa.png", { type: "image/png" }));
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Quay lại" }));
    expect((picker as HTMLInputElement).files?.[0]?.name).toBe("qa.png");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(repository.write).not.toHaveBeenCalled(); expect(repository.upload).not.toHaveBeenCalled();
  });
  it("closes an untouched measurement form without a discard prompt", async () => {
    const closeMeasurement = vi.fn();
    render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={closeMeasurement} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(closeMeasurement).toHaveBeenCalledOnce(); expect(repository.write).not.toHaveBeenCalled();
  });
  it("reads the photo first, then records the confirmed values with the returned photo key", async () => {
    const { loadOptions } = await import("./lookups");
    vi.mocked(loadOptions).mockResolvedValueOnce({ status: "success", data: [{ id: ids.raft, code: "B-QA" }] });
    const ocr = { status: "Failed" as const, ph: null, salinity: null, temperature: null, measuredAt: null, unread: ["PH", "SALINITY", "TEMPERATURE"],
      warning: { code: "MSG-WATER-01", text: "Chưa đọc được pH, độ mặn, nhiệt độ." } };
    const recognition = { photoKey: "photo-key-qa", measuredAt: "2026-10-01T08:00:00+07:00", ocr, valuesOutside: [], thresholdWarning: null };
    const recorded = waterFixture(), onSaved = vi.fn();
    // A measurement older than 15 days is refused (BR-WATER-03), so the clock stays next to the recognised time.
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-02T08:00:00+07:00"));
    repository.upload.mockResolvedValue({ status: "success", data: recognition });
    repository.write.mockResolvedValue({ status: "success", data: recorded });
    render(<NewMeasurement zoneId={ids.zone} zoneName="Vùng QA" onClose={vi.fn()} onSaved={onSaved} />);
    await userEvent.upload(screen.getByLabelText("Ảnh máy đo * (JPEG/PNG, tối đa 10 MB)"), new File(["png"], "qa.png", { type: "image/png" }));
    // jsdom's native file-required validator does not observe user-event's FileList; submit the real handler.
    const recognizeButton = screen.getByRole("button", { name: "Nhận dạng từ ảnh" });
    fireEvent.submit(recognizeButton.closest("form")!);
    expect(await screen.findByText("Chưa đọc được pH, độ mặn, nhiệt độ.")).toBeTruthy();
    expect(repository.upload.mock.calls[0].slice(0, 3)).toEqual(["recognize", [expect.any(File)], {}]);
    expect(repository.write).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Lưu phép đo" })).not.toBe(recognizeButton);
    await screen.findByRole("option", { name: "B-QA" });
    fireEvent.change(screen.getByLabelText("Bè đo *"), { target: { value: ids.raft } });
    fireEvent.change(screen.getByLabelText("pH (0–14) *"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByLabelText("Độ mặn (‰, 0–50) *"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Nhiệt độ (°C, 0–45) *"), { target: { value: "26" } });
    fireEvent.submit(screen.getByRole("button", { name: "Lưu phép đo" }).closest("form")!);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(recorded, ocr));
    expect(repository.write.mock.calls[0].slice(0, 2)).toEqual(["record", expect.objectContaining({
      raftId: ids.raft, measuredAt: "2026-10-01T08:00:00+07:00", ph: 7.5, salinity: 25, temperature: 26, photoKey: "photo-key-qa", clientOperationId: expect.any(String),
    })]);
  });
  it("offers no correction of a recorded measurement, only voiding", () => {
    render(<MeasurementEditor record={waterFixture()} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hiệu chỉnh" })).toBeNull();
    expect(screen.queryByLabelText("Lý do hiệu chỉnh *")).toBeNull();
    expect(screen.getByRole("button", { name: "Hủy bỏ phép đo" })).toBeTruthy();
  });
  it("voids an active measurement with only a reason after confirmation", async () => {
    repository.write.mockResolvedValue({ status: "success", data: waterFixture({ statusCode: "VOIDED", status: "Voided", voidReason: "Đo nhầm bè" }) });
    render(<MeasurementEditor record={waterFixture()} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy bỏ phép đo" }));
    fireEvent.change(screen.getByLabelText("Lý do hủy *"), { target: { value: "Đo nhầm bè" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy phép đo" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0].slice(0, 2)).toEqual(["void", { reason: "Đo nhầm bè" }]);
  });
  it("does not offer voiding a voided measurement", () => {
    render(<MeasurementEditor record={waterFixture({ statusCode: "VOIDED", status: "Voided", voidReason: "Đo nhầm bè" })} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hủy bỏ phép đo" })).toBeNull();
    expect(screen.getByText("Lý do hủy: Đo nhầm bè")).toBeTruthy();
    expect(repository.write).not.toHaveBeenCalled();
  });
  it("retains the cancellation reason and confirmation when the server refuses the change", async () => {
    repository.write.mockResolvedValue({ status: "error", httpStatus: 400, uncertain: false });
    render(<MeasurementEditor record={waterFixture()} onClose={vi.fn()} onSaved={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy bỏ phép đo" }));
    fireEvent.change(screen.getByLabelText("Lý do hủy *"), { target: { value: "Đo nhầm bè" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy phép đo" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledOnce());
    expect(screen.getByRole("dialog", { name: "Hủy bỏ phép đo?" })).toBeTruthy();
    expect((screen.getByLabelText("Lý do hủy *") as HTMLTextAreaElement).value).toBe("Đo nhầm bè");
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Đã hủy phép đo tại/)).toBeNull();
  });
});
