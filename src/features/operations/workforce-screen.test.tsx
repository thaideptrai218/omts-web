// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), options: vi.fn(), subjectType: "CooperativeOwner", permissions: [] as unknown[], kinds: new Map<string, string>() }));
// The kind of each employee (nội bộ / thời vụ) comes from the employee list, which this suite does not serve: it is given here.
vi.mock("@/features/employee-api/use-employee-types", () => { const kindOf = (id?: string | null) => id ? mocks.kinds.get(id) : undefined; return { useEmployeeKinds: () => kindOf, useEmployeeFacts: () => ({ kindOf, zonesOf: () => [] }) }; });
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
vi.mock("./lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: mocks.permissions } }) }));
import { MyWorkScreen } from "./my-work-screen";
import { ids } from "./__tests__/fixtures";
import { businessToday } from "./ui";
import { WorkforceScreen } from "./workforce-screen";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.resetAllMocks(); window.localStorage.clear(); mocks.subjectType = "CooperativeOwner"; mocks.permissions = []; mocks.kinds.clear(); mocks.options.mockResolvedValue({ status: "success", data: [{ id: ids.zone, name: "Vùng Đông" }] }); });
afterEach(cleanup);

const row = (id: string, name: string, patch: Record<string, unknown> = {}) => ({ id, employeeId: ids.item, employeeName: name, zoneId: ids.zone, raftId: ids.water, raftCode: "BE01", jobTypeId: ids.line, job: "Thu hoạch", date: businessToday(), checkedInAt: null, checkedOutAt: null, ...patch });
const shiftDay = (offset: number) => { const date = new Date(`${businessToday()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
const footerButtons = ["Vào làm", "Ra về", "Gỡ phân công"];

describe("workforce day board in the management design", () => {
  it("keeps closed rows free of actions and opens one row at a time", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An"), row("b", "Nhân viên Bình")] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    const closed = screen.getByText("Nhân viên An").closest("tr")!;
    // The chevron and the one-click check-in; the detail footer actions stay hidden.
    expect(within(closed).getAllByRole("button")).toHaveLength(2);
    for (const name of footerButtons) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByText("Nhân viên An"));
    expect(screen.getByRole("region", { name: "Chi tiết phân công Nhân viên An" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Bình" }));
    expect(screen.queryByRole("region", { name: "Chi tiết phân công Nhân viên An" })).toBeNull();
    expect(screen.getByRole("region", { name: "Chi tiết phân công Nhân viên Bình" })).toBeTruthy();
  });

  it("offers the footer actions only where the date and check rules allow them", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An"), row("b", "Nhân viên Bình", { date: shiftDay(-1) }), row("c", "Nhân viên Cường", { checkedInAt: "2026-11-11T08:00:00+07:00" })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    for (const name of footerButtons) expect(screen.getByRole("button", { name })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Bình" }));
    for (const name of footerButtons) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Cường" }));
    expect(screen.getByRole("button", { name: "Ra về" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vào làm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gỡ phân công" })).toBeNull();
  });

  it("hides every footer action from a Staff account without grants", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An")] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    for (const name of footerButtons) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tạo phân công" })).toBeNull();
  });

  it("sends a check-in from the opened row in one click", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An")] });
    mocks.write.mockResolvedValue({ status: "success", data: row("a", "Nhân viên An") });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    fireEvent.click(screen.getByRole("button", { name: "Vào làm" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0][0]).toBe("check-in");
    expect(mocks.write.mock.calls[0][3]).toBe("a");
  });

  it("lets a zone-level assignment with no raft be checked in and out", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("z", "Nhân viên Zin", { raftId: null, raftCode: null })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên Zin");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Zin" }));
    expect(screen.getByRole("button", { name: "Vào làm" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ra về" })).toBeTruthy();
    // One label for a zone-level assignment, shared with the weekly schedule.
    expect(screen.queryByText("Chưa xác định")).toBeNull();
  });

  it("lets a zone manager holding ATTENDANCE Edit correct attendance and review leave, but not open the setup", async () => {
    mocks.subjectType = "Staff";
    const grant = (action: string) => ({ functionCode: "ATTENDANCE", action, dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } });
    mocks.permissions = [{ functionCode: "WORK_ASSIGNMENTS", action: "View", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } }, grant("Edit")];
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An", { date: shiftDay(-1) })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    expect(screen.getByRole("button", { name: "Sửa chấm công" })).toBeTruthy();
    // "Duyệt yêu cầu" is a visible toolbar button now; the setup stays Owner-only inside the more menu (which this account does not get).
    expect(screen.getByRole("button", { name: /Duyệt yêu cầu/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thao tác khác" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Thiết lập chấm công" })).toBeNull();
    expect(mocks.read.mock.calls.some((call) => call[0] === "leaves")).toBe(true);
  });

  it("keeps the correction closed for a zone manager without ATTENDANCE Edit in the zone of the row", async () => {
    mocks.subjectType = "Staff";
    mocks.permissions = [{ functionCode: "ATTENDANCE", action: "Edit", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.otherZone] } },
      { functionCode: "WORK_ASSIGNMENTS", action: "View", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } }];
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An", { date: shiftDay(-1) })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    expect(screen.queryByRole("button", { name: "Sửa chấm công" })).toBeNull();
  });

  it("queries the stepped day and the owner-only actions stay in the more menu", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [] });
    render(<WorkforceScreen />);
    await screen.findByText("Chưa có phân công cho ngày này.");
    // The day list is read per day (the night shift of yesterday is read too, only for today).
    const listed = () => mocks.read.mock.calls.filter((call) => call[0] === "list").map((call) => (call[1] as { day: string }).day);
    expect(listed()).toContain(businessToday());
    fireEvent.click(screen.getByRole("button", { name: "Ngày trước" }));
    await waitFor(() => expect(listed()).toContain(shiftDay(-1)));
    fireEvent.click(screen.getByRole("button", { name: "Hôm nay" }));
    await waitFor(() => expect(listed().filter((day) => day === businessToday()).length).toBeGreaterThan(1));
    // The two daily actions are visible buttons; only the setup items are inside the more menu.
    for (const name of ["Đổi việc trong ngày", "Duyệt yêu cầu"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thiết lập chấm công" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    for (const name of ["Thiết lập chấm công", "Thêm loại công việc"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Đổi việc trong ngày" })).toBeNull();
    expect(screen.getByRole("link", { name: /Loại công việc/ })).toBeTruthy();
  });

  it("narrows the table by the attendance status pills without a new request", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An"), row("b", "Nhân viên Bình", { checkedInAt: "2026-11-11T08:00:00+07:00" })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByLabelText("Đang làm", { selector: "input" }));
    expect(screen.queryByText("Nhân viên An")).toBeNull();
    expect(screen.getByText("Nhân viên Bình")).toBeTruthy();
    expect(mocks.read.mock.calls.filter((call) => call[0] === "list" && (call[1] as { day: string }).day === businessToday())).toHaveLength(1);
  });

  it("marks nội bộ and thời vụ people and filters the board by kind", async () => {
    const staff = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", seasonal = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
    mocks.kinds.set(staff, "Staff"); mocks.kinds.set(seasonal, "SeasonalWorker");
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An", { employeeId: staff }), row("b", "Nhân viên Bình", { employeeId: seasonal })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    expect(within(screen.getByText("Nhân viên An").closest("tr")!).getByText("Nội bộ")).toBeTruthy();
    expect(within(screen.getByText("Nhân viên Bình").closest("tr")!).getByText("Thời vụ")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Thời vụ"));
    await waitFor(() => expect(screen.queryByText("Nhân viên An")).toBeNull());
    expect(screen.getByText("Nhân viên Bình")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Nội bộ"));
    await waitFor(() => expect(screen.queryByText("Nhân viên Bình")).toBeNull());
    fireEvent.click(screen.getByLabelText("Tất cả", { selector: 'input[name="workforce-employee-type"]' }));
    expect(await screen.findByText("Nhân viên Bình")).toBeTruthy();
  });

  it("keeps the error state with a retry when the list API fails", async () => {
    mocks.read.mockResolvedValueOnce({ status: "error", httpStatus: 404, uncertain: false }).mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An")] });
    render(<WorkforceScreen />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Tải lại phân công" }));
    await screen.findByText("Nhân viên An");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("my work in the management design", () => {
  const leave = (id: string, patch: Record<string, unknown> = {}) => ({ id, employeeName: "Nhân viên An", from: "2026-11-20", to: "2026-11-21", reason: "Việc gia đình", approved: null, response: null, rowVersion: "AAAA", cancelledAt: null, ...patch });
  const data = { employeeId: ids.item, name: "Nhân viên An", assignments: [row("a", "Nhân viên An")], attendance: [], requests: [leave(ids.receipt), leave(ids.line, { approved: true, response: "Đồng ý" })] };

  it("switches between assignments, worked days and leave requests", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data });
    render(<MyWorkScreen />);
    await screen.findByText("Thu hoạch");
    fireEvent.click(screen.getByRole("tab", { name: "Ngày công" }));
    await screen.findByText("Không có dữ liệu trong khoảng thời gian đã chọn.");
    fireEvent.click(screen.getByRole("tab", { name: "Yêu cầu nghỉ phép" }));
    expect(screen.getAllByText("Việc gia đình")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Xin nghỉ phép" })).toBeTruthy();
  });

  it("cancels a pending leave only from the opened row after confirming", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data });
    mocks.write.mockResolvedValue({ status: "success", data: leave(ids.receipt, { cancelledAt: "2026-11-11T08:00:00+07:00" }) });
    render(<MyWorkScreen />);
    await screen.findByText("Thu hoạch");
    fireEvent.click(screen.getByRole("tab", { name: "Yêu cầu nghỉ phép" }));
    expect(screen.queryByRole("button", { name: "Hủy nghỉ phép" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /^Mở yêu cầu nghỉ/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Hủy nghỉ phép" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0][0]).toBe("cancel-leave");
    expect(mocks.write.mock.calls[0][3]).toBe(ids.receipt);
  });

  it("opens the leave pop-up from the toolbar", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data });
    render(<MyWorkScreen />);
    await screen.findByText("Thu hoạch");
    fireEvent.click(screen.getByRole("button", { name: "Xin nghỉ phép" }));
    expect(await screen.findByLabelText("Lý do nghỉ *")).toBeTruthy();
  });
});
