// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { detail, ids, ok, polyfillDialog, slip } from "./payroll-test-fixtures";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as unknown[] } },
  repo: { list: vi.fn(), detail: vi.fn(), create: vi.fn(), reload: vi.fn(), finalize: vi.fn(), cancel: vi.fn(), pay: vi.fn(), exportSheet: vi.fn(), exportList: vi.fn(), payments: vi.fn(), payable: vi.fn(), payStandalone: vi.fn() },
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("./repository", () => ({ payrollRepository: state.repo }));
import { PayrollDetailFooter } from "./payroll-detail-footer";

const finalized = detail({
  status: "Finalized", total: 3_500_000, paid: 1_000_000, outstanding: 2_500_000,
  slips: [slip(), slip({ id: ids.slipB, code: "PL000002", employeeId: ids.empB, employeeName: "Trần Thị B", mainPay: 500_000, income: 500_000, net: 500_000, paid: 500_000, outstanding: 0 })],
});

beforeEach(() => { polyfillDialog(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("footer buttons are explicit type=button and never submit a surrounding form when the status changes", async () => {
  state.repo.exportSheet.mockResolvedValue(ok(true));
  const submit = vi.fn((event: { preventDefault(): void }) => event.preventDefault()), user = userEvent.setup();
  const view = (sheet: typeof finalized) => <form onSubmit={submit}><PayrollDetailFooter sheet={sheet} onChanged={vi.fn()} /></form>;
  const { rerender } = render(view(detail({ status: "Provisional" })));
  const group = () => screen.getByRole("group", { name: "Thao tác bảng lương" });
  const clickAll = async () => { for (const button of within(group()).getAllByRole("button")) await user.click(button); };
  expect(within(group()).getAllByRole("button").every((button) => button.getAttribute("type") === "button")).toBe(true);
  await clickAll();
  // Provisional -> Finalized at the same place: the right-hand "Chốt lương" node must not turn into a submit button.
  rerender(view(finalized));
  expect(within(group()).getAllByRole("button").map((button) => button.textContent)).toEqual(["Tải xuống▾"]);
  expect(within(group()).getAllByRole("button").every((button) => button.getAttribute("type") === "button")).toBe(true);
  await user.click(within(group()).getByRole("button", { name: "Tải xuống" }));
  expect(submit).not.toHaveBeenCalled();
});
