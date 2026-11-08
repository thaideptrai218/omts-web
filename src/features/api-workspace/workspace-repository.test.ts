import { afterEach, expect, it, vi } from "vitest";
import { createWorkspaceRepository } from "./workspace-repository";
afterEach(() => vi.restoreAllMocks());
it("keeps an expired write ambiguous and never replays it", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "session-expired" }, { status: 401 }));
  expect(await createWorkspaceRepository("suppliers").mutate("update", { name: "draft" }, "qa")).toMatchObject({ status: "error", httpStatus: 401, uncertain: true }); expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([401, 503])("does not describe a failed read%s as an uncertain write", async (status) => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "unavailable" }, { status }));
  expect(await createWorkspaceRepository("zones").list({})).toMatchObject({ status: "error", uncertain: false });
});
it("keeps network failure uncertain only for mutations", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const repository = createWorkspaceRepository("input-items"); expect(await repository.detail("qa")).toMatchObject({ status: "error", uncertain: false });
  expect(await repository.mutate("create", {})).toMatchObject({ status: "error", uncertain: true });
});
