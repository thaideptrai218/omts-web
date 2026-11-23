// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ day: vi.fn(), create: vi.fn() }));
vi.mock("./schedule-service", () => ({ scheduleService: mocks }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { businessToday } from "@/features/operations/ui";
import { CopyWeekDialog } from "./copy-week-dialog";
import { shiftDay, weekStart, weekDays } from "./schedule-model";
import { testAssignment, testIds as ids } from "./__tests__/schedule-fixtures";
import { installDialogPolyfill, removeDialogPolyfill } from "./__tests__/dialog-polyfill";
beforeAll(installDialogPolyfill); afterAll(removeDialogPolyfill); afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

it("warns without blocking free cells, previews duplicates, confirms then reports failures and progress", async () => {
  const monday = shiftDay(weekStart(businessToday()), 7), previous = shiftDay(monday, -7);
  const existing = testAssignment({ date: monday });
  mocks.day.mockImplementation(async (day: string) => ({ status: "success", data: day === previous ? [testAssignment({ date: previous }),
    testAssignment({ id: "another", employeeId: ids.secondPerson, employeeName: "Bình", date: previous })] : day === monday ? [existing] : [] }));
  mocks.create.mockResolvedValue({ status: "error", httpStatus: 400, uncertain: false });
  const copied = vi.fn();
  render(<ToastProvider><CopyWeekDialog monday={monday} zoneId={ids.zone} target={weekDays(monday).map((day) => ({ day, rows: day === monday ? [existing] : [], loading: false }))}
    people={[{ id: ids.person, name: "An", eligible: true }, { id: ids.secondPerson, name: "Bình", eligible: true }]} canCreate={() => true} onClose={vi.fn()} onCopied={copied} /></ToastProvider>);
  const confirm = await screen.findByRole("button", { name: "Xác nhận chép 1 phân công" });
  expect(screen.getByText(/Vẫn có thể chép các ô trống/)).toBeTruthy();
  expect(screen.getByText("Bỏ qua: đã có phân công trùng")).toBeTruthy();
  expect(mocks.create).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  await waitFor(() => expect(copied).toHaveBeenCalledOnce());
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(mocks.create.mock.lastCall?.[0].employeeId).toBe(ids.secondPerson);
  expect(screen.getByText("Đã xử lý 1/1 phân công")).toBeTruthy();
  expect(screen.getByRole("list", { name: "Kết quả từng phân công" }).textContent).toContain("Bình");
  expect(screen.queryByRole("button", { name: /Xác nhận chép/ })).toBeNull();
});
