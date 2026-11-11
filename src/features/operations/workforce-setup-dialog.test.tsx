// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
import { WorkforceSetupDialog } from "./workforce-setup-dialog";
import { businessToday } from "./ui";

const version = { effectiveFrom: "2026-08-01", breakStart: "11:30:00", breakEnd: "12:30:00", roundingUnit: "Minutes15" };
const overview = { current: version, versions: [version], rowVersion: "AAAA" };
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue({ status: "success", data: overview });
  mocks.write.mockResolvedValue({ status: "success", data: { settings: { ...overview, rowVersion: "BBBB" }, message: "Saved", messageCode: "MSG-GEN-05" } });
});
afterEach(cleanup);

describe("attendance settings against the backend contract", () => {
  it.each([["0", "None"], ["15", "Minutes15"], ["30", "Minutes30"], ["60", "Hour1"]])("maps the %s minute choice to %s and sends rowVersion", async (minutes, roundingUnit) => {
    render(<WorkforceSetupDialog onClose={vi.fn()} />);
    await waitFor(() => expect((screen.getByLabelText("Nghỉ từ") as HTMLInputElement).value).toBe("11:30"));
    expect((screen.getByLabelText("Làm tròn (phút)") as HTMLSelectElement).value).toBe("15");
    expect(screen.getByText("2026-08-01")).toBeTruthy();
    expect(screen.getByText("11:30")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Làm tròn (phút)"), { target: { value: minutes } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText("Đã lưu thiết lập chấm công.");
    expect(mocks.write.mock.calls[0][0]).toBe("settings");
    expect(mocks.write.mock.calls[0][1]).toEqual({ effectiveFrom: businessToday(), breakStart: "11:30:00", breakEnd: "12:30:00", roundingUnit, rowVersion: "AAAA" });
    expect(mocks.write.mock.calls[0][2].safeParse({ settings: overview, message: "Saved", messageCode: "MSG-GEN-05" }).success).toBe(true);
  });
  it("sends both absent break bounds as null", async () => {
    render(<WorkforceSetupDialog onClose={vi.fn()} />);
    await waitFor(() => expect((screen.getByLabelText("Nghỉ từ") as HTMLInputElement).value).toBe("11:30"));
    for (const label of ["Nghỉ từ", "Nghỉ đến"]) fireEvent.change(screen.getByLabelText(label), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText("Đã lưu thiết lập chấm công.");
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ breakStart: null, breakEnd: null });
  });
  it("keeps backend second precision when saving the current break", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: { ...overview, current: { ...version, breakStart: "11:30:45" } } });
    render(<WorkforceSetupDialog onClose={vi.fn()} />);
    await waitFor(() => expect((screen.getByLabelText("Nghỉ từ") as HTMLInputElement).value).toBe("11:30:45"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText("Đã lưu thiết lập chấm công.");
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ breakStart: "11:30:45", breakEnd: "12:30:00" });
  });
  it("blocks mismatched break bounds without sending a mutation", async () => {
    render(<WorkforceSetupDialog onClose={vi.fn()} />);
    await waitFor(() => expect((screen.getByLabelText("Nghỉ từ") as HTMLInputElement).value).toBe("11:30"));
    fireEvent.change(screen.getByLabelText("Nghỉ đến"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
    await screen.findByRole("alert");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("preserves the draft after a stale response and reads the new rowVersion before retry", async () => {
    mocks.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false });
    render(<WorkforceSetupDialog onClose={vi.fn()} />);
    await waitFor(() => expect((screen.getByLabelText("Nghỉ từ") as HTMLInputElement).value).toBe("11:30"));
    fireEvent.change(screen.getByLabelText("Làm tròn (phút)"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Lưu thiết lập" }).matches(":disabled")).toBe(true);
    mocks.read.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
    fireEvent.click(screen.getByRole("button", { name: "Tải lại thiết lập" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tải lại thiết lập" }).matches(":disabled")).toBe(false));
    expect(screen.getByRole("button", { name: "Lưu thiết lập" }).matches(":disabled")).toBe(true);
    expect(mocks.write).toHaveBeenCalledTimes(1);
    mocks.read.mockResolvedValue({ status: "success", data: { ...overview, rowVersion: "BBBB" } });
    fireEvent.click(screen.getByRole("button", { name: "Tải lại thiết lập" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu thiết lập" }).matches(":disabled")).toBe(false));
    expect((screen.getByLabelText("Làm tròn (phút)") as HTMLSelectElement).value).toBe("60");
    fireEvent.click(screen.getByRole("button", { name: "Lưu thiết lập" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText("Đã lưu thiết lập chấm công.");
    expect(mocks.write.mock.calls[1][1]).toMatchObject({ rowVersion: "BBBB", roundingUnit: "Hour1" });
  });
});
