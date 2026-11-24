import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ day: vi.fn(), create: vi.fn() }));
vi.mock("./schedule-service", () => ({ scheduleService: mocks }));
import { executeCopyWeek } from "./copy-week-service";
import { previewCopyWeek } from "./copy-week-model";
import { testAssignment, testIds as ids } from "./__tests__/schedule-fixtures";
import { businessToday } from "@/features/operations/ui";
import { shiftDay } from "./schedule-model";

beforeEach(() => { vi.resetAllMocks(); mocks.day.mockResolvedValue({ status: "success", data: [] }); });
const candidates = () => previewCopyWeek([testAssignment({ date: shiftDay(businessToday(), -7) }), testAssignment({ id: "second", date: shiftDay(businessToday(), -6) })], [],
  [{ id: ids.person, name: "An", eligible: true }], ids.zone, businessToday());

describe("copy execution", () => {
  it("waits for each write, continues after a known failure, reports each row and never moves existing work", async () => {
    let release!: (value: unknown) => void;
    mocks.create.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }))
      .mockResolvedValueOnce({ status: "error", httpStatus: 400, uncertain: false });
    const progress = vi.fn();
    const running = executeCopyWeek(candidates(), progress, () => true);
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(progress).not.toHaveBeenCalled();
    release({ status: "success", data: [] });
    const result = await running;
    expect(result.map((row) => row.status)).toEqual(["created", "failed"]);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls.every((call) => call.length === 1)).toBe(true);
    expect(progress.mock.lastCall?.[0]).toMatchObject({ completed: 2, total: 2 });
  });
  it("skips a destination occupied since preview and does not send it", async () => {
    mocks.day.mockResolvedValue({ status: "success", data: [testAssignment({ date: businessToday() })] });
    const result = await executeCopyWeek(candidates().slice(0, 1), vi.fn(), () => true);
    expect(result[0].status).toBe("skipped"); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("never creates a day that failed its fresh read", async () => {
    mocks.day.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
    const result = await executeCopyWeek(candidates(), vi.fn(), () => true);
    expect(result.every((row) => row.status === "failed")).toBe(true); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not replay uncertain writes and stops remaining rows after lost authorization", async () => {
    mocks.create.mockResolvedValueOnce({ status: "error", httpStatus: 401, uncertain: true });
    const result = await executeCopyWeek(candidates(), vi.fn(), () => true);
    expect(result.map((row) => row.status)).toEqual(["failed", "failed"]);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("honors a revoked Create grant before writing", async () => {
    const result = await executeCopyWeek(candidates(), vi.fn(), () => false);
    expect(result.every((row) => row.status === "failed")).toBe(true); expect(mocks.create).not.toHaveBeenCalled();
  });
});
