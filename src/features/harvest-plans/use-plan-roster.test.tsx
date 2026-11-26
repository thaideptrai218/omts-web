// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PlanRoster } from "./contracts";
import { describeRosterChanges } from "./plan-roster-logic";

const state = vi.hoisted(() => ({ roster: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), planRepository: { roster: state.roster } }));
import { ROSTER_POLL_MS, usePlanRoster } from "./use-plan-roster";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const person = (n: number, name: string, stateName: string) => ({ id: id(n), employeeId: id(n + 50), code: null, name, phoneNumber: null, type: "Staff", hasAccount: true, state: stateName, invitedAt: "2026-11-26T08:00:00+07:00", respondedAt: null, reason: null, confirmedBy: null, rowVersion: "r" });
const roster = (version: string, people: object[]) => ({
  planId: id(1), planCode: "KHT000001", rowVersion: "p1", rosterVersion: version, requiredPeople: 3, canEdit: true, people,
  summary: { requiredPeople: 3, confirmed: 0, invited: people.length, declined: 0, external: 0, missing: 3, ready: false },
}) as unknown as PlanRoster;
const ok = (data: PlanRoster) => ({ status: "success", data });
const setVisibility = (value: "visible" | "hidden") => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value }); };

beforeEach(() => { vi.useFakeTimers(); state.roster.mockReset(); setVisibility("visible"); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("reads once, then every 5 seconds while the page is visible", async () => {
  state.roster.mockResolvedValue(ok(roster("v1", [person(1, "An", "Invited")])));
  const { result } = renderHook(() => usePlanRoster(id(1), true));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current.roster?.rosterVersion).toBe("v1");
  expect(state.roster).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS); });
  expect(state.roster).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS); });
  expect(state.roster).toHaveBeenCalledTimes(3);
  expect(result.current.updatedAt).toBeInstanceOf(Date);
});

it("does not read while the tab is hidden and reads again as soon as it is visible", async () => {
  state.roster.mockResolvedValue(ok(roster("v1", [])));
  renderHook(() => usePlanRoster(id(1), true));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  setVisibility("hidden");
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS * 3); });
  expect(state.roster).toHaveBeenCalledTimes(1);
  setVisibility("visible");
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await vi.advanceTimersByTimeAsync(0); });
  expect(state.roster).toHaveBeenCalledTimes(2);
});

it("reads once and stops polling when the plan is over", async () => {
  state.roster.mockResolvedValue(ok(roster("v1", [])));
  renderHook(() => usePlanRoster(id(1), false));
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS * 4); });
  expect(state.roster).toHaveBeenCalledTimes(1);
});

it("tells who confirmed or declined since the last read, but not what the caller changed itself", async () => {
  state.roster.mockResolvedValueOnce(ok(roster("v1", [person(1, "Nguyễn Văn A", "Invited"), person(2, "Trần B", "Invited")])))
    .mockResolvedValue(ok(roster("v2", [person(1, "Nguyễn Văn A", "Confirmed"), person(2, "Trần B", "Declined")])));
  const { result } = renderHook(() => usePlanRoster(id(1), true));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current.news).toEqual([]);
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS); });
  expect(result.current.news).toEqual(["Nguyễn Văn A vừa xác nhận", "Trần B vừa từ chối"]);
  act(() => result.current.dismissNews());
  expect(result.current.news).toEqual([]);
  // The same version again changes nothing and announces nothing.
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS); });
  expect(result.current.news).toEqual([]);
});

it("keeps the last roster and shows a message when a poll fails", async () => {
  state.roster.mockResolvedValueOnce(ok(roster("v1", [person(1, "An", "Invited")]))).mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  const { result } = renderHook(() => usePlanRoster(id(1), true));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  await act(async () => { await vi.advanceTimersByTimeAsync(ROSTER_POLL_MS); });
  expect(result.current.roster?.rosterVersion).toBe("v1");
  expect(result.current.error).toBeTruthy();
});

it("describeRosterChanges ignores people added or taken off", () => {
  expect(describeRosterChanges(roster("v1", [person(1, "An", "Invited")]), roster("v2", [person(2, "Bình", "Confirmed")]))).toEqual([]);
});
