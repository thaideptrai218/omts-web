// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema, type Employee } from "./contracts";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import { EmployeeApiEditor } from "./employee-editor";

const jobId = "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22";
const record = (over: Partial<Employee> = {}): Employee => ({ ...employeeViewSchema.parse(employeeDetailFixture()), ...over });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("employee detail: Thông tin tab shows and edits the new profile fields in place", () => {
  async function open(employee = record()) {
    repository.read.mockResolvedValue({ status: "success", data: employee });
    repository.write.mockResolvedValue({ status: "success", data: employee });
    render(<EmployeeDetailPanel id={employee.id} cache={new Map()} onSaved={vi.fn()} zones={[{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }]} jobTypes={[{ id: jobId, name: "Thu hoạch" }]} lookupsReady />);
    await screen.findByRole("tab", { name: "Thông tin" });
    return within(screen.getByRole("tabpanel"));
  }
  const edit = () => fireEvent.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: "Chỉnh sửa" }));
  const save = () => fireEvent.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: "Lưu" }));
  const change = (label: string, value: string) => fireEvent.change(within(screen.getByRole("tabpanel")).getByLabelText(label, { exact: true }), { target: { value } });
  const sent = () => repository.write.mock.calls[0][1] as Record<string, unknown>;

  it("reads code, gender, start date and CCCD, and no email", async () => {
    const panel = await open();
    for (const [label, value] of [["Mã nhân viên", "NV000001"], ["Giới tính", "Nam"], ["Ngày bắt đầu làm việc", "01/03/2025"], ["CCCD", "012345678901"]]) {
      expect(panel.getByText(label).closest("div")!.textContent).toContain(value);
    }
    expect(panel.queryByText("Email")).toBeNull();
  });
  it("shows CCCD as not updated when the backend sent none", async () => {
    const panel = await open(record({ idNumber: null, gender: null, startDate: null }));
    expect(panel.getByText("CCCD").closest("div")!.textContent).toContain("Chưa cập nhật");
    expect(panel.getByText("Giới tính").closest("div")!.textContent).toContain("Chưa cập nhật");
  });
  it("edits code (upper-cased), gender, start date and CCCD and sends them with the row version", async () => {
    await open(record({ idNumber: null, gender: null, startDate: null })); edit();
    change("Mã nhân viên", "nv-77"); change("Giới tính", "Female"); change("CCCD", "012345678");
    fireEvent.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: /^Ngày bắt đầu làm việc: chưa chọn/ }));
    fireEvent.click(document.querySelector<HTMLButtonElement>("button.rdp-day_button:not([disabled])")!);
    save();
    await waitFor(() => expect(repository.write).toHaveBeenCalled());
    expect(sent()).toMatchObject({ code: "NV-77", gender: "Female", idNumber: "012345678", rowVersion: record().rowVersion });
    expect(sent().startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(sent().startDate as string <= new Date().toISOString().slice(0, 10)).toBe(true);
    expect(sent()).not.toHaveProperty("email");
  });
  it("offers no way to clear gender or start date, and clears CCCD with an empty string", async () => {
    await open(); edit();
    expect((within(screen.getByRole("tabpanel")).getByLabelText("Giới tính") as HTMLSelectElement).value).toBe("Male");
    change("CCCD", ""); save();
    await waitFor(() => expect(repository.write).toHaveBeenCalled());
    expect(sent()).toMatchObject({ idNumber: "", gender: "Male", startDate: "2025-03-01" });
  });
  it.each([["CCCD", "12345", "CCCD gồm 9 hoặc 12 chữ số."], ["Mã nhân viên", "NV 01", "Mã gồm chữ, số và dấu gạch ngang"], ["Mã nhân viên", "", "Nhập mã nhân viên."]])("validates %s=%j inline without a request", async (label, value, message) => {
    await open(); edit(); change(label, value); save();
    expect(repository.write).not.toHaveBeenCalled();
    expect(within(screen.getByRole("tabpanel")).getByText(new RegExp(message)).getAttribute("role")).toBe("alert");
    expect(within(screen.getByRole("tabpanel")).getByLabelText(label, { exact: true }).getAttribute("aria-invalid")).toBe("true");
  });
  it("shows the uniqueness error MSG-GEN-02 on the code field and keeps the draft", async () => {
    await open(); edit(); change("Mã nhân viên", "NV000002");
    repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-02", uncertain: false });
    save();
    const code = within(screen.getByRole("tabpanel")).getByLabelText("Mã nhân viên", { exact: true });
    await waitFor(() => expect(code.getAttribute("aria-invalid")).toBe("true"));
    expect(document.getElementById(code.getAttribute("aria-describedby")!)?.textContent).toBe("Mã nhân viên đã được dùng cho nhân viên khác.");
    expect((code as HTMLInputElement).value).toBe("NV000002");
  });
  it("maps a backend field error on the new fields to their inputs", async () => {
    await open(); edit(); change("CCCD", "123456789");
    repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG01", uncertain: false, employeeProblem: { kind: "invalid-fields", fields: ["ID number"] } });
    save();
    await waitFor(() => expect(within(screen.getByRole("tabpanel")).getByLabelText("CCCD", { exact: true }).getAttribute("aria-invalid")).toBe("true"));
  });
  it("keeps code, gender and CCCD unchanged when another tab is saved", async () => {
    await open();
    fireEvent.click(screen.getByRole("tab", { name: "Công việc" })); edit();
    fireEvent.click(within(screen.getByRole("tabpanel")).getByRole("checkbox", { name: "Thu hoạch" })); save();
    await waitFor(() => expect(repository.write).toHaveBeenCalled());
    expect(sent()).toMatchObject({ code: "NV000001", gender: "Male", idNumber: "012345678901", startDate: "2025-03-01" });
  });
});

describe("create modal: new profile fields", () => {
  const props = () => ({ zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], jobTypes: [{ id: jobId, name: "Thu hoạch" }], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
  const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  const saveNew = () => fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  function fillRequired() { type("Họ và tên *", "Người mới"); type("Loại nhân viên *", "Staff"); fireEvent.click(screen.getByRole("checkbox", { name: /Vùng Đông/ })); }

  it("sends blank code as null (auto) and no email field exists", async () => {
    repository.write.mockResolvedValue({ status: "success", data: record() });
    render(<EmployeeApiEditor {...props()} />); fillRequired(); saveNew();
    await waitFor(() => expect(repository.write).toHaveBeenCalled());
    expect(repository.write.mock.calls[0][1]).toMatchObject({ code: null, gender: null, idNumber: null, startDate: null });
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("email");
  });
  it("sends an upper-cased typed code, gender, CCCD and start date", async () => {
    repository.write.mockResolvedValue({ status: "success", data: record() });
    render(<EmployeeApiEditor {...props()} />); fillRequired();
    type("Mã nhân viên", "nv-9"); type("Giới tính", "Other");
    fireEvent.click(screen.getByRole("button", { name: /Thông tin cá nhân/ })); type("CCCD", "012345678901");
    fireEvent.click(screen.getByRole("button", { name: /^Ngày bắt đầu làm việc: chưa chọn/ }));
    fireEvent.click(document.querySelector<HTMLButtonElement>("button.rdp-day_button:not([disabled])")!);
    saveNew();
    await waitFor(() => expect(repository.write).toHaveBeenCalled());
    expect(repository.write.mock.calls[0][1]).toMatchObject({ code: "NV-9", gender: "Other", idNumber: "012345678901" });
    expect(repository.write.mock.calls[0][1].startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("opens the personal group and focuses a bad CCCD before sending", async () => {
    render(<EmployeeApiEditor {...props()} />); fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Thông tin cá nhân/ })); type("CCCD", "12");
    fireEvent.click(screen.getByRole("button", { name: /Thông tin cá nhân/ }));
    saveNew();
    await waitFor(() => expect(screen.getByRole("button", { name: /Thông tin cá nhân.*Có lỗi/ }).getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("CCCD", { exact: true })));
    expect(screen.getAllByText("CCCD gồm 9 hoặc 12 chữ số.").length).toBeGreaterThan(0); expect(repository.write).not.toHaveBeenCalled();
  });
  it("rejects a malformed code in the basic group and shows MSG-GEN-02 beside the code input", async () => {
    render(<EmployeeApiEditor {...props()} />); fillRequired(); type("Mã nhân viên", "bad code"); saveNew();
    expect(screen.getAllByText(/Mã gồm chữ, số và dấu gạch ngang/).length).toBeGreaterThan(0); expect(repository.write).not.toHaveBeenCalled();
    type("Mã nhân viên", "NV000002");
    repository.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-02", uncertain: false });
    saveNew();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Mã nhân viên", { exact: true })));
    expect(screen.getAllByText("Mã nhân viên đã được dùng cho nhân viên khác.").length).toBeGreaterThan(0);
  });
});
