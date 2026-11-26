import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((to: string) => { throw new Error(`redirect:${to}`); }));
vi.mock("next/navigation", () => ({ redirect, notFound: () => { throw new Error("notFound"); } }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/server/auth/session-gateway.instance", () => ({ getSessionGateway: () => ({ mode: "api" }) }));
vi.mock("@/features/api-workspace/api-resource-screen", () => ({ ApiResourceScreen: () => null }));
import WorkspaceResourcePage from "./page";

const page = (resource: string) => WorkspaceResourcePage({ params: Promise.resolve({ resource }) });
beforeEach(() => { redirect.mockClear(); });

describe("user management addresses", () => {
  it("open Tài khoản người dùng and Vai trò và quyền on their own, with no redirect to the Nhân viên screen", async () => {
    for (const resource of ["accounts", "roles"]) {
      expect(await page(resource)).toMatchObject({ props: { resource } });
    }
    expect(redirect).not.toHaveBeenCalled();
  });
  it("still sends the input catalogue to its own screen and opens the other resources", async () => {
    await expect(page("input-items")).rejects.toThrow("redirect:/inputs/items");
    expect(await page("zones")).toBeTruthy();
  });
  it("answers an unknown resource with not found", async () => {
    await expect(page("nothing")).rejects.toThrow("notFound");
  });
});
