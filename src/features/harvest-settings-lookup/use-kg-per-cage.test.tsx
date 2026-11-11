// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read }) }));
import { useKgPerCage } from "./use-kg-per-cage";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("useKgPerCage", () => {
  it("hides old ratios on account changes and ignores late replies from an aborted request", async () => {
    let resolveOld!: (value: unknown) => void;
    let resolveNew!: (value: unknown) => void;
    read.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useKgPerCage(id), { initialProps: { id: "owner-a" } as { id?: string } });
    const oldSignal = read.mock.calls[0][3] as AbortSignal;
    rerender({ id: "owner-b" });
    expect(oldSignal.aborted).toBe(true);
    await act(async () => resolveOld({ status: "success", data: { averageKgPerCage: 50 } }));
    expect(result.current).toEqual({ loading: true });
    await act(async () => resolveNew({ status: "success", data: { averageKgPerCage: 80 } }));
    expect(result.current).toEqual({ loading: false, kgPerCage: 80 });
    read.mockImplementationOnce(() => new Promise(() => {}));
    rerender({ id: undefined });
    expect(result.current).toEqual({ loading: false });
    rerender({ id: "owner-b" });
    expect(result.current).toEqual({ loading: true });
    expect(result.current.kgPerCage).toBeUndefined();
  });

  it("does not request Owner-only settings when the caller cannot read them", async () => {
    const { result } = renderHook(() => useKgPerCage());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kgPerCage).toBeUndefined();
    expect(read).not.toHaveBeenCalled();
  });

  it("returns the cooperative average read through the harvest settings action", async () => {
    read.mockResolvedValue({ status: "success", data: { averageKgPerCage: 50, daysBeforeAutoClose: 7, rowVersion: "x" } });
    const { result } = renderHook(() => useKgPerCage("owner-a"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kgPerCage).toBe(50); expect(read.mock.calls[0][0]).toBe("settings");
  });
  it("yields undefined without permission (403) so callers show kg only", async () => {
    read.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
    const { result } = renderHook(() => useKgPerCage("owner-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kgPerCage).toBeUndefined();
  });
  it("never throws when the read rejects", async () => {
    read.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useKgPerCage("owner-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kgPerCage).toBeUndefined();
  });
  it("ignores an unusable ratio", async () => {
    read.mockResolvedValue({ status: "success", data: { averageKgPerCage: 0, daysBeforeAutoClose: 7, rowVersion: "x" } });
    const { result } = renderHook(() => useKgPerCage("owner-a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kgPerCage).toBeUndefined();
  });
});
