// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ harvest: vi.fn(), workforce: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: (area: string) => ({ read: area === "harvest" ? state.harvest : state.workforce }) }));
import { readHarvestCrew } from "./harvest-crew-repository";
import { HarvestCrewPicker } from "./harvest-crew-picker";
import { HarvestCrewDetail } from "./harvest-crew-detail";
import { crewIds, crewSuggestions } from "./harvest-crew-contracts";
import { harvestCorrection, harvestDetail, harvestValues } from "./records-contracts";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const id1 = "00000000-0000-4000-8000-000000000001", id2 = "00000000-0000-4000-8000-000000000002", raft = "00000000-0000-4000-8000-000000000009";
const ok = (data: unknown) => ({ status: "success", data });
const miss = { status: "error", httpStatus: 404, uncertain: false };
const lookups = (...names: [string, string][]) => ok({ jobs: [], employees: names.map(([id, name]) => ({ id, name, onLeave: false })) });

it("validates crew ids and the real crew read shape", () => {
  expect(crewIds.safeParse([id1, id1]).success).toBe(false);
  expect(crewIds.safeParse(Array.from({ length: 101 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`)).success).toBe(false);
  expect(harvestValues.parse({ laneNumbers: [1], finishedLaneNumbers: [], cageCount: 0.5, estimatedKg: null, crew: [id1, id2] }).crew).toEqual([id1, id2]);
  expect(harvestCorrection.safeParse({ laneNumbers: [1], finishedLaneNumbers: [], cageCount: 1, estimatedKg: null, replaceCrew: true, keepPhotoKeys: [], reason: "x", rowVersion: "v" }).success).toBe(true);
  expect(crewSuggestions.parse({ raftId: raft, date: "2026-11-12", employees: [{ id: id1, code: "NV000001", name: "An" }] }).employees[0].name).toBe("An");
  expect(harvestDetail.shape.crew.parse([{ id: id1, code: "NV000001", name: "An" }])).toHaveLength(1);
});
it("puts employees assigned to this raft first and keeps every active employee selectable", async () => {
  state.harvest.mockResolvedValue(ok({ employees: [{ id: id2, code: "NV2", name: "Bình" }] }));
  state.workforce.mockResolvedValue(lookups([id1, "An"], [id2, "Bình"]));
  const result = await readHarvestCrew(raft, raft, "2026-11-12");
  expect(result).toEqual({ status: "success", data: [{ id: id2, name: "Bình", preferred: true }, { id: id1, name: "An", preferred: false }] });
  expect(state.harvest).toHaveBeenCalledWith("crew-suggestions", { id: raft, zoneId: raft, date: "2026-11-12" }, expect.anything(), undefined);
  const onChange = vi.fn();
  render(<HarvestCrewPicker raftId={raft} zoneId={raft} values={[]} onChange={onChange} />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "An" }));
  expect(onChange).toHaveBeenCalledWith([id1]);
  expect(screen.getByText("Đã phân công cho bè hôm nay")).toBeTruthy();
});
it("still offers the suggestions when the user cannot read the workforce lookups", async () => {
  state.harvest.mockResolvedValue(ok({ employees: [{ id: id1, name: "An" }] }));
  state.workforce.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
  expect(await readHarvestCrew(raft, raft, "2026-11-12")).toEqual({ status: "success", data: [{ id: id1, name: "An", preferred: true }] });
});
it("shows a quiet state when both endpoints are missing and keeps retry for real errors", async () => {
  state.harvest.mockResolvedValue(miss); state.workforce.mockResolvedValue(miss);
  render(<HarvestCrewPicker raftId={raft} zoneId={raft} values={[]} onChange={vi.fn()} />);
  expect(await screen.findByText("Chưa có danh sách nhân viên để chọn.")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  cleanup();
  state.harvest.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false }); state.workforce.mockResolvedValue(miss);
  render(<HarvestCrewPicker raftId={raft} zoneId={raft} values={[]} onChange={vi.fn()} />);
  const retry = await screen.findByRole("button", { name: "Tải lại nhân viên" });
  expect(retry.getAttribute("type")).toBe("button");
  state.harvest.mockResolvedValue(ok({ employees: [] })); state.workforce.mockResolvedValue(lookups());
  fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
it("links each crew member of a lot to the employee record", () => {
  render(<HarvestCrewDetail crew={[{ id: id1, code: "NV01", name: "An" }, { id: id2, name: "Bình" }]} />);
  expect(screen.getByRole("link", { name: "An" }).getAttribute("href")).toBe(`/employees?recordId=${id1}`);
  expect(screen.getByRole("link", { name: "Bình" }).getAttribute("href")).toBe(`/employees?recordId=${id2}`);
  cleanup();
  render(<HarvestCrewDetail crew={[]} />);
  expect(screen.getByText("Chưa ghi nhận nhân viên cùng thu.")).toBeTruthy();
  cleanup();
  expect(render(<HarvestCrewDetail />).container.textContent).toBe("");
});
