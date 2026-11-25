// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const replace = vi.hoisted(() => vi.fn());
const options = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: options }));
import { EmployeeAccountLinkRedirect } from "./employee-account-link-redirect";

const id = "11111111-1111-4111-8111-111111111111", employeeId = "22222222-2222-4222-8222-222222222222";
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("old account links", () => {
  it("open the employee who holds the login", async () => {
    options.mockResolvedValue({ status: "success", data: [{ id, username: "quanlyvung1", employeeId }] });
    render(<EmployeeAccountLinkRedirect accountId={id.toUpperCase()} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/workspace/employees?recordId=${employeeId}&tab=account`));
  });
  it("open the list of logins without an employee, with that login open", async () => {
    options.mockResolvedValue({ status: "success", data: [{ id, username: "free", employeeId: null }] });
    render(<EmployeeAccountLinkRedirect accountId={id} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/workspace/employees?account=unlinked&openAccount=${id}`));
  });
  it("fall back to the employee list when the login is not there", async () => {
    options.mockResolvedValue({ status: "success", data: [] });
    render(<EmployeeAccountLinkRedirect accountId={id} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace/employees"));
  });
  it("say so and offer the list when the logins cannot be read", async () => {
    options.mockResolvedValue({ status: "error", httpStatus: 500, uncertain: false });
    render(<EmployeeAccountLinkRedirect accountId={id} />);
    expect(await screen.findByText("Chưa mở được tài khoản này. Hãy chọn nhân viên trong danh sách.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mở danh sách nhân viên" }).getAttribute("href")).toBe("/workspace/employees");
    expect(replace).not.toHaveBeenCalled();
  });
});
