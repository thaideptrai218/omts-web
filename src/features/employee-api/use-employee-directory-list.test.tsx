// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useEmployeeDirectoryList } from "./use-employee-directory-list";

afterEach(cleanup);
it("keeps visible data during refresh and replaces it only after the response", async () => {
  let finish!: (result: WorkspaceResult<string[]>) => void;
  const loader = vi.fn().mockResolvedValueOnce({ status: "success", data: ["old"] })
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const hook = renderHook(() => useEmployeeDirectoryList<string[]>(loader));
  await waitFor(() => expect(hook.result.current.data).toEqual(["old"]));
  act(() => hook.result.current.reload());
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(hook.result.current.loading).toBe(true);
  expect(hook.result.current.data).toEqual(["old"]);
  await act(async () => finish({ status: "success", data: ["new"] }));
  expect(hook.result.current.data).toEqual(["new"]);
});

it("clears old-filter data and ignores an aborted query's late result", async () => {
  let finishOld!: (result: WorkspaceResult<string[]>) => void;
  const oldLoader = vi.fn().mockResolvedValueOnce({ status: "success", data: ["old"] })
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  let finishNew!: (result: WorkspaceResult<string[]>) => void;
  const newLoader = vi.fn().mockImplementation(() => new Promise(resolve => { finishNew = resolve; }));
  const hook = renderHook(({ loader }) => useEmployeeDirectoryList<string[]>(loader), { initialProps: { loader: oldLoader } });
  await waitFor(() => expect(hook.result.current.data).toEqual(["old"]));
  act(() => hook.result.current.reload());
  await waitFor(() => expect(oldLoader).toHaveBeenCalledTimes(2));
  hook.rerender({ loader: newLoader });
  await waitFor(() => expect(newLoader).toHaveBeenCalledTimes(1));
  expect(hook.result.current.data).toBeUndefined();
  await act(async () => finishOld({ status: "success", data: ["stale"] }));
  expect(hook.result.current.data).toBeUndefined();
  await act(async () => finishNew({ status: "success", data: ["filtered"] }));
  expect(hook.result.current.data).toEqual(["filtered"]);
});
