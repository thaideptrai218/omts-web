// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadEmployeeWorkspaceResult } from "../domain/employee-management";
import { mockEmployeeProfiles, mockEmployeeZones } from "../mocks/employee-management-fixtures";
import { EmployeeManagementExperience } from "./employee-management-experience";

const { context, load, publish } = vi.hoisted(() => ({
  context: { accountId: "owner-a", canManage: true, authenticated: true },
  load: vi.fn<() => Promise<LoadEmployeeWorkspaceResult>>(), publish: vi.fn(),
}));
vi.mock("@/features/auth/state/auth-provider", () => ({ useAuth: () => ({
  state: context.authenticated
    ? { status: "authenticated", account: { accountId: context.accountId, access: {} } }
    : { status: "anonymous" },
}) }));
vi.mock("@/features/access/lib/has-effective-permission", () => ({ hasEffectivePermission: () => context.canManage }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("@/features/employee-management/services/employee-management-service.instance", () => ({
  employeeManagementService: { load, save: vi.fn(), unlinkAccount: vi.fn() },
}));
vi.mock("@/shared/session/session-expiry-channel", () => ({ sessionExpiryChannel: { publish } }));

function pendingLoad() {
  let resolve!: (result: LoadEmployeeWorkspaceResult) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<LoadEmployeeWorkspaceResult>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function loaded(name: string): LoadEmployeeWorkspaceResult {
  return { status: "loaded", workspace: { availableAccounts: [], zones: mockEmployeeZones,
    employees: [{ ...mockEmployeeProfiles[0], id: `employee-${name}`, fullName: `Nhân viên ${name}` }],
  } };
}
async function complete(request: ReturnType<typeof pendingLoad>, result: LoadEmployeeWorkspaceResult) {
  await act(async () => { request.resolve(result); await request.promise; });
}
beforeEach(() => {
  vi.clearAllMocks(); load.mockReset();
  Object.assign(context, { accountId: "owner-a", canManage: true, authenticated: true });
});
afterEach(cleanup);

describe("employee workspace load ownership", () => {
  it("loads a new workspace for account B even when both accounts have permission", async () => {
    const a = pendingLoad(); const b = pendingLoad();
    load.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const view = render(<EmployeeManagementExperience />);
    context.accountId = "owner-b"; view.rerender(<EmployeeManagementExperience />);
    expect(load).toHaveBeenCalledTimes(2);
    await complete(a, loaded("A"));
    expect(screen.queryByRole("button", { name: /Nhân viên A/ })).toBeNull();
    await complete(b, loaded("B"));
    expect(screen.getByRole("button", { name: /Nhân viên B/ })).toBeTruthy();
  });

  it("hides already loaded account A data while account B is still loading", async () => {
    const b = pendingLoad();
    load.mockResolvedValueOnce(loaded("A")).mockReturnValueOnce(b.promise);
    const view = render(<EmployeeManagementExperience />);
    await screen.findByRole("button", { name: /Nhân viên A/ });
    context.accountId = "owner-b"; view.rerender(<EmployeeManagementExperience />);
    expect(screen.queryByRole("button", { name: /Nhân viên A/ })).toBeNull();
    expect(screen.getByRole("status", { name: "Đang tải danh sách nhân viên" })).toBeTruthy();
    await complete(b, loaded("B"));
  });

  it.each([loaded("A"), { status: "session-expired", message: { code: "MSG19" } } satisfies LoadEmployeeWorkspaceResult])(
    "ignores a late retry from A after B loaded: $status", async (oldResult) => {
      const retry = pendingLoad();
      load.mockRejectedValueOnce(new Error("Fixture load failed"))
        .mockReturnValueOnce(retry.promise).mockResolvedValueOnce(loaded("B"));
      const view = render(<EmployeeManagementExperience />);
      fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
      context.accountId = "owner-b"; view.rerender(<EmployeeManagementExperience />);
      await screen.findByRole("button", { name: /Nhân viên B/ });
      await complete(retry, oldResult);
      expect(screen.getByRole("button", { name: /Nhân viên B/ })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Nhân viên A/ })).toBeNull();
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it("ignores a rejected retry from the old account without replacing B with an error", async () => {
    const retry = pendingLoad();
    load.mockRejectedValueOnce(new Error("Fixture load failed"))
      .mockReturnValueOnce(retry.promise).mockResolvedValueOnce(loaded("B"));
    const view = render(<EmployeeManagementExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
    context.accountId = "owner-b"; view.rerender(<EmployeeManagementExperience />);
    await screen.findByRole("button", { name: /Nhân viên B/ });
    await act(async () => { retry.reject(new Error("Old request failed")); });
    expect(screen.getByRole("button", { name: /Nhân viên B/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tải lại" })).toBeNull();
  });

  it("does not publish session expiry when a pending retry completes after unmount", async () => {
    const retry = pendingLoad();
    load.mockRejectedValueOnce(new Error("Fixture load failed")).mockReturnValueOnce(retry.promise);
    const view = render(<EmployeeManagementExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
    view.unmount();
    await complete(retry, { status: "session-expired", message: { code: "MSG19" } });
    expect(publish).not.toHaveBeenCalled();
  });

  it("discards an old load on permission loss and loads fresh data when access returns", async () => {
    const oldLoad = pendingLoad();
    load.mockReturnValueOnce(oldLoad.promise).mockResolvedValueOnce(loaded("Current"));
    const view = render(<EmployeeManagementExperience />);
    context.canManage = false; view.rerender(<EmployeeManagementExperience />);
    expect(screen.getByRole("heading", { name: "Không có quyền quản lý nhân viên" })).toBeTruthy();
    await complete(oldLoad, { status: "session-expired", message: { code: "MSG19" } });
    expect(publish).not.toHaveBeenCalled();
    context.canManage = true; view.rerender(<EmployeeManagementExperience />);
    await screen.findByRole("button", { name: /Nhân viên Current/ });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not retain an old workspace through logout and login to the same account", async () => {
    const oldLoad = pendingLoad();
    load.mockReturnValueOnce(oldLoad.promise).mockResolvedValueOnce(loaded("Current"));
    const view = render(<EmployeeManagementExperience />);
    context.authenticated = false; view.rerender(<EmployeeManagementExperience />);
    await complete(oldLoad, loaded("A"));
    expect(screen.queryByRole("button", { name: /Nhân viên A/ })).toBeNull();
    context.authenticated = true; view.rerender(<EmployeeManagementExperience />);
    await screen.findByRole("button", { name: /Nhân viên Current/ });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("still publishes MSG19 from the active request", async () => {
    load.mockResolvedValueOnce({ status: "session-expired", message: { code: "MSG19" } });
    render(<EmployeeManagementExperience />);
    await waitFor(() => expect(publish).toHaveBeenCalledWith({ code: "MSG19" }));
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("shows MSG02 and no employee data when the active load is forbidden", async () => {
    load.mockResolvedValueOnce({ status: "forbidden", message: { code: "MSG02" } });
    render(<EmployeeManagementExperience />);
    await screen.findByRole("heading", { name: "Không có quyền quản lý nhân viên" });
    expect(screen.queryByRole("region", { name: "Danh sách nhân viên" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tải lại" })).toBeNull();
  });

  it("handles a synchronous service failure and uses the same load path for a successful retry", async () => {
    load.mockImplementationOnce(() => { throw new Error("Fixture load failed"); }).mockResolvedValueOnce(loaded("Recovered"));
    render(<EmployeeManagementExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
    await screen.findByRole("button", { name: /Nhân viên Recovered/ });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ignores the first effect's late result during Strict Mode setup and cleanup", async () => {
    const first = pendingLoad(); const replay = pendingLoad();
    load.mockReturnValueOnce(first.promise).mockReturnValueOnce(replay.promise);
    render(<StrictMode><EmployeeManagementExperience /></StrictMode>);
    expect(load).toHaveBeenCalledTimes(2);
    await complete(first, { status: "session-expired", message: { code: "MSG19" } });
    expect(publish).not.toHaveBeenCalled();
    await complete(replay, loaded("Current"));
    expect(screen.getByRole("button", { name: /Nhân viên Current/ })).toBeTruthy();
  });
});
