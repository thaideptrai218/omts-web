// @vitest-environment jsdom
import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock("@/components/ui/use-action-dialog", () => ({ useActionDialog: () => ({ confirm: state.confirm, dialog: null }) }));
import { useUnsavedGuard } from "./use-unsaved-guard";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("prevents navigation during a mutation without dropping the draft", async () => {
  const { result } = renderHook(useUnsavedGuard), apply = vi.fn();
  result.current.pending.current = true; result.current.dirty.current = true;
  await act(() => result.current.leave(apply));
  expect(apply).not.toHaveBeenCalled(); expect(state.confirm).not.toHaveBeenCalled();
  expect(result.current.dirty.current).toBe(true);
});
it("preserves a draft when discard is declined and leaves only after confirmation", async () => {
  const { result } = renderHook(useUnsavedGuard), apply = vi.fn();
  result.current.dirty.current = true; state.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await act(() => result.current.leave(apply)); expect(apply).not.toHaveBeenCalled();
  await act(() => result.current.leave(apply)); expect(apply).toHaveBeenCalledOnce();
  expect(result.current.dirty.current).toBe(false);
});
