import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((to: string) => { throw new Error(`redirect:${to}`); }));
vi.mock("next/navigation", () => ({ redirect, notFound: () => { throw new Error("notFound"); } }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/server/auth/session-gateway.instance", () => ({ getSessionGateway: () => ({ mode: "api" }) }));
vi.mock("@/features/api-workspace/api-resource-screen", () => ({ ApiResourceScreen: () => null }));
vi.mock("@/features/employee-api/employee-account-link-redirect", () => ({ EmployeeAccountLinkRedirect: () => null }));
import WorkspaceResourcePage from "./page";

const page = (resource: string, search: Record<string, string | string[] | undefined> = {}) => WorkspaceResourcePage({ params: Promise.resolve({ resource }), searchParams: Promise.resolve(search) });
beforeEach(() => { redirect.mockClear(); });

describe("old user management addresses", () => {
  it("send /workspace/roles to the Nhân viên screen", async () => {
    await expect(page("roles")).rejects.toThrow("redirect:/workspace/employees");
  });
  it("send /workspace/accounts to the Nhân viên screen", async () => {
    await expect(page("accounts")).rejects.toThrow("redirect:/workspace/employees");
    await expect(page("accounts", { accountId: "not-an-id" })).rejects.toThrow("redirect:/workspace/employees");
    await expect(page("accounts", { accountId: ["a", "b"] })).rejects.toThrow("redirect:/workspace/employees");
  });
  it("find the employee for /workspace/accounts?accountId=<id>", async () => {
    const element = await page("accounts", { accountId: "11111111-1111-4111-8111-111111111111" });
    expect(element).toMatchObject({ props: { accountId: "11111111-1111-4111-8111-111111111111" } });
    expect(redirect).not.toHaveBeenCalled();
  });
  it("still opens the other resources", async () => {
    expect(await page("zones")).toBeTruthy();
  });
});
