// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
import { backendRequest } from "./__tests__/purchase-request-fixture";
import { PurchaseRequestStaffingSection } from "./purchase-request-staffing-section";
import { businessToday } from "./ui";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const people = [{ id: id(1), name: "Nguyễn Văn Hải", available: true }, { id: id(2), name: "Trần Thị Lan", available: true }, { id: id(3), name: "Lê Văn Nam", available: false, unavailableReason: "Đã được phân công hôm đó" }];
const sent = () => ({ cages: 8, workDate: businessToday(), pickupDate: businessToday(), requiredEmployees: 1, approvedEmployees: 1, hasEnoughStaff: true, cagesPerEmployeePerDay: 8, note: null });
const open = (request = backendRequest({ pickupDate: businessToday() }), onSaved = vi.fn()) => render(<PurchaseRequestStaffingSection request={request} onSaved={onSaved} />);
const answer = (chosen: unknown[] = []) => mocks.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "staffing" ? chosen : action === "staffing-employees" ? people : undefined }));

beforeEach(() => { vi.resetAllMocks(); answer(); });
afterEach(cleanup);

describe("Kế hoạch nhân sự of a purchase request", () => {
  it("lists the employees on offer for the pickup day, filters them by name and keeps the unavailable ones from being chosen", async () => {
    open();
    expect(await screen.findByLabelText("Nguyễn Văn Hải")).toBeTruthy();
    expect(mocks.read).toHaveBeenCalledWith("staffing-employees", { id: backendRequest().id, day: businessToday() }, expect.anything(), expect.anything());
    expect((screen.getByLabelText(/Lê Văn Nam/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Đã được phân công hôm đó")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "lan" } });
    expect(screen.queryByLabelText("Nguyễn Văn Hải")).toBeNull();
    expect(screen.getByLabelText("Trần Thị Lan")).toBeTruthy();
  });

  it("saves the plan, reads the request again for its new row version and hands it to the screen", async () => {
    const updated = backendRequest({ rowVersion: "BBBB", staffing: sent() }), onSaved = vi.fn();
    mocks.write.mockResolvedValue({ status: "success", data: sent() });
    mocks.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "staffing" ? [] : action === "staffing-employees" ? people : updated }));
    open(undefined, onSaved);
    fireEvent.click(await screen.findByLabelText("Nguyễn Văn Hải"));
    fireEvent.change(screen.getByLabelText("Số lồng cần lấy *"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu kế hoạch nhân sự" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    expect(mocks.write).toHaveBeenCalledWith("staffing", { cages: 10, workDate: businessToday(), pickupDate: businessToday(), cagesPerEmployeePerDay: 10, employeeIds: [id(1)], note: null, rowVersion: "AAAA" }, expect.anything(), backendRequest().id);
    expect(mocks.read).toHaveBeenCalledWith("detail", { id: backendRequest().id }, expect.anything());
  });

  it("checks the form before any write and shows the refusal of the API", async () => {
    open();
    await screen.findByLabelText("Nguyễn Văn Hải");
    fireEvent.click(screen.getByRole("button", { name: "Lưu kế hoạch nhân sự" }));
    expect(await screen.findByText(/Chọn ít nhất một nhân viên/)).toBeTruthy();
    expect(mocks.write).not.toHaveBeenCalled();
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 400, uncertain: false });
    fireEvent.click(screen.getByLabelText("Trần Thị Lan"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu kế hoạch nhân sự" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("shows a sent plan as a plain list, keeps its cages and day, and only adds employees", async () => {
    answer([{ id: id(10), employeeId: id(1), employeeName: "Nguyễn Văn Hải" }]);
    mocks.write.mockResolvedValue({ status: "success", data: sent() });
    open(backendRequest({ staffing: sent(), rowVersion: "CCCC" }));
    expect(await screen.findByText("Nguyễn Văn Hải", { selector: "li" })).toBeTruthy();
    expect(screen.queryByLabelText("Số lồng cần lấy *")).toBeNull();
    expect(screen.queryByLabelText("Nguyễn Văn Hải")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lưu kế hoạch nhân sự" }));
    expect(await screen.findByText(/Chọn thêm ít nhất một nhân viên/)).toBeTruthy();
    fireEvent.click(await screen.findByLabelText("Trần Thị Lan"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu kế hoạch nhân sự" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ cages: 8, cagesPerEmployeePerDay: 8, employeeIds: [id(1), id(2)], rowVersion: "CCCC" });
  });
});
