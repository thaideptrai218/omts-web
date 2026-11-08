import { expect, it } from "vitest";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";
import { createDemoWorkforceRepository } from "./repository";
function setup() {
  const env = createMockManagementEnvironment(0);
  const repository = createDemoWorkforceRepository({ accounts: () => env.accounts.snapshotAccounts(), roles: () => env.roles.snapshotRoles(), zones: () => env.zones.snapshotOptions(), employees: () => env.employees.snapshotEmployees(), rafts: () => env.rafts.snapshotRafts() }, () => new Date("2026-11-02T03:00:00Z"));
  return { env, repository };
}
const day = "2026-11-02", owner = "account-owner-demo", manager = "account-nguyen-an";
it("supports local assignment, check-in/out, and rejects stale and duplicate changes", async () => {
  const { repository } = setup(), view = await repository.load(owner, day);
  if (view.status !== "success") throw new Error("Expected demo workspace");
  const raft = view.data.rafts.find((row) => row.zoneId === "zone-east")!;
  const input = { raftId: raft.id, date: day, job: "Thu hoạch", employeeIds: ["employee-nguyen-an"] };
  expect(await repository.assign(owner, input)).toEqual({ status: "success", data: true });
  expect(await repository.assign(owner, input)).toMatchObject({ status: "error", httpStatus: 409 });
  const loaded = await repository.load(manager, day);
  if (loaded.status !== "success") throw new Error("Expected manager workspace");
  const row = loaded.data.assignments[0];
  expect(await repository.act(manager, row.id, row.version, "check-in")).toMatchObject({ status: "success" });
  expect(await repository.act(manager, row.id, row.version, "check-out")).toMatchObject({ status: "error", httpStatus: 409 });
  expect(await repository.act(manager, row.id, row.version + 1, "check-out")).toMatchObject({ status: "success" });
  expect(await repository.act(manager, row.id, row.version + 2, "remove")).toMatchObject({ status: "error", httpStatus: 400 });
});
it("filters Manager scope and rejects cross-zone or invalid employee assignments atomically", async () => {
  const { repository } = setup(), loaded = await repository.load(owner, day);
  if (loaded.status !== "success") throw new Error("Expected workspace");
  const south = loaded.data.rafts.find((raft) => raft.zoneId === "zone-south")!, east = loaded.data.rafts.find((raft) => raft.zoneId === "zone-east")!;
  expect(await repository.assign(manager, { raftId: south.id, date: day, job: "Thu hoạch", employeeIds: ["employee-le-lan"] })).toMatchObject({ status: "error", httpStatus: 403 });
  expect(await repository.assign(owner, { raftId: east.id, date: day, job: "Thu hoạch", employeeIds: ["employee-nguyen-an", "employee-le-lan"] })).toMatchObject({ status: "error", httpStatus: 400 });
  const result = await repository.load(manager, day);
  expect(result).toMatchObject({ status: "success", data: { assignments: [] } });
  if (result.status === "success") expect(result.data.zones.map((zone) => zone.id)).toEqual(["zone-east"]);
  expect(await repository.load("account-tran-binh", day)).toMatchObject({ status: "error", httpStatus: 403 });
});
