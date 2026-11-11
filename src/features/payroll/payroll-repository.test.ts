import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read, write: vi.fn(), download: vi.fn() }) }));
import { payrollRepository } from "./repository";

beforeEach(() => state.read.mockReset());

it("shows a missing list endpoint (404) as an empty list, not as an error", async () => {
  state.read.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  const query = { search: "", periodType: "", statuses: [], sortBy: "code", sortDir: "desc", page: 1, pageSize: 15 } as const;
  expect(await payrollRepository.list(query)).toEqual({ status: "success", data: { items: [], total: 0, page: 1, pageSize: 15, summary: { total: 0, paid: 0, outstanding: 0 } } });
  expect(await payrollRepository.payments({ search: "", from: "", to: "", page: 1, pageSize: 15 })).toMatchObject({ status: "success", data: { items: [], total: 0 } });
  expect(await payrollRepository.employeeSlips("e", { page: 1, pageSize: 15 })).toMatchObject({ status: "success", data: { items: [], summary: { outstanding: 0, advanceBalance: 0 } } });
});

it("keeps every other failure as an error, and single-record reads are not softened", async () => {
  state.read.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  expect(await payrollRepository.payments({ search: "", from: "", to: "", page: 1, pageSize: 15 })).toMatchObject({ status: "error", httpStatus: 503 });
  state.read.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  expect(await payrollRepository.detail("x")).toMatchObject({ status: "error", httpStatus: 404 });
  expect(await payrollRepository.slip("x")).toMatchObject({ status: "error", httpStatus: 404 });
});

it("passes the employee filter and the slip status to the BFF query", async () => {
  state.read.mockResolvedValue({ status: "success", data: {} });
  await payrollRepository.payments({ search: "", from: "", to: "", page: 1, pageSize: 15, employeeId: "e1" });
  expect(state.read).toHaveBeenLastCalledWith("list", expect.objectContaining({ employeeId: "e1" }), expect.anything(), undefined);
  await payrollRepository.employeeSlips("e1", { status: "Finalized", page: 1, pageSize: 100 });
  expect(state.read).toHaveBeenLastCalledWith("employee-slips", { id: "e1", status: "Finalized", page: "1", pageSize: "100" }, expect.anything(), undefined);
});
