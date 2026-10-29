// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({ query: "", list: vi.fn(), detail: vi.fn(), mutate: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("./api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./workspace-repository", () => ({ createWorkspaceRepository: () => state }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { ApiResourceScreen } from "./api-resource-screen";
const id = "ab03cd89-d7c9-40b9-bb15-908d6abdb840";
beforeEach(() => { vi.clearAllMocks(); state.list.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 20, total: 0 } }); state.detail.mockResolvedValue({ status: "success", data: { id, username: "qa.staff", displayName: "QA Staff", phoneNumber: "0900000000", email: null, status: "Active", rowVersion: "AQID" } }); });
afterEach(cleanup);
describe("employee account follow-up navigation", () => {
  it("opens the specifically requested account for review without running a mutation", async () => {
    state.query = `accountId=${id}`; render(<ApiResourceScreen resource="accounts" />);
    await screen.findByRole("dialog", { name: "Hồ sơ · Tài khoản" }); expect(state.detail).toHaveBeenCalledWith(id, expect.any(AbortSignal)); expect(state.mutate).not.toHaveBeenCalled();
  });
  it("does not turn duplicate or malformed account IDs in the URL into a backend read", async () => {
    state.query = `accountId=${id}&accountId=bad`; render(<ApiResourceScreen resource="accounts" />);
    await waitFor(() => expect(state.list).toHaveBeenCalled()); expect(state.detail).not.toHaveBeenCalled(); expect(state.mutate).not.toHaveBeenCalled();
  });
});
