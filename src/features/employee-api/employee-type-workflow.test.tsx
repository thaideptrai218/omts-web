// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const repository = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => repository }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { EmployeeApiEditor } from "./employee-editor";
import { employeeDetailFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";
import { employeeViewSchema } from "./contracts";
const fixture = () => employeeViewSchema.parse(employeeDetailFixture());
const props = () => ({ record: fixture(), zones: [{ id: workingZoneId, code: "V01", name: "Vùng Đông", statusId: 101 }], jobTypes: [], lookupsReady: true, onClose: vi.fn(), onAdopt: vi.fn(), onSaved: vi.fn() });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("employee API type edits and comparison", () => {
  it("keeps an existing null type unchanged on an unrelated edit", async () => {
    const record = { ...fixture(), employeeType: null };
    repository.write.mockResolvedValue({ status: "success", data: record });
    render(<EmployeeApiEditor {...props()} record={record} />);
    expect((screen.getByLabelText("Loại nhân viên", { exact: true }) as HTMLSelectElement).required).toBe(false);
    expect(screen.queryByLabelText("Áp dụng từ ngày *")).toBeNull();
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Chỉ sửa ghi chú" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).toMatchObject({ notes: "Chỉ sửa ghi chú", jobTypeIds: [] });
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("employeeType");
    expect(repository.write.mock.calls[0][1]).not.toHaveProperty("employeeTypeFrom");
  });
  it("requires an effective date when assigning a type to a null-type profile", async () => {
    repository.write.mockResolvedValue({ status: "success", data: fixture() });
    render(<EmployeeApiEditor {...props()} record={{ ...fixture(), employeeType: null }} />);
    fireEvent.change(screen.getByLabelText("Loại nhân viên", { exact: true }), { target: { value: "Staff" } });
    const date = screen.getByLabelText("Áp dụng từ ngày *");
    fireEvent.submit(screen.getByRole("button", { name: "Lưu hồ sơ" }).closest("form")!);
    expect(repository.write).not.toHaveBeenCalled();
    expect(date.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(date, { target: { value: "01/11/2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await waitFor(() => expect(repository.write).toHaveBeenCalledTimes(1));
    expect(repository.write.mock.calls[0][1]).toMatchObject({ employeeType: "Staff", employeeTypeFrom: "2026-11-01" });
  });
  it("does not offer clearing an existing employee type", () => {
    render(<EmployeeApiEditor {...props()} />);
    const type = screen.getByLabelText("Loại nhân viên", { exact: true }) as HTMLSelectElement;
    expect(Array.from(type.options).map((option) => option.value)).toEqual(["SeasonalWorker", "Staff"]);
  });
  it("shows the latest employee and job types before retaining a conflict draft", async () => {
    const latest = { ...fixture(), employeeType: "SeasonalWorker" as const, jobTypes: [{ id: "9429f1c0-b70f-42d6-9a9f-1c6a1e608c22", name: "Thu hoạch", status: "In Use" }], rowVersion: "AQID" };
    repository.write.mockResolvedValue({ status: "error", code: "MSG06", httpStatus: 409, uncertain: false });
    repository.read.mockResolvedValue({ status: "success", data: latest });
    render(<EmployeeApiEditor {...props()} />);
    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bản nháp" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải hồ sơ mới để đối chiếu" }));
    expect(await screen.findByText("Loại nhân viên: Thời vụ")).toBeTruthy();
    expect(screen.getByText("Loại công việc: Thu hoạch")).toBeTruthy();
    expect(repository.write).toHaveBeenCalledTimes(1);
  });
});
