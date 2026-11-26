import { afterEach, expect, it, vi } from "vitest";

const lookups = vi.hoisted(() => ({ loadOptions: vi.fn() }));
vi.mock("@/features/operations/lookups", () => lookups);
import { loadInUseZones } from "./in-use-zones";

afterEach(() => vi.clearAllMocks());
const zone = (id: string, statusId: number) => ({ id, code: id.toUpperCase(), name: `Vùng ${id}`, statusId, status: statusId === 101 ? "In Use" : "Discontinued" });

it("asks the server for In Use zones only and still drops a discontinued row that comes back", async () => {
  lookups.loadOptions.mockResolvedValue({ status: "success", data: [zone("a", 101), zone("b", 102), { id: "c", code: "C", name: "Vùng c", status: "Discontinued" }, { id: "d", code: "D", name: "Vùng d" }] });
  const signal = new AbortController().signal;
  const result = await loadInUseZones(signal);
  expect(lookups.loadOptions).toHaveBeenCalledWith("zones", signal, { statusId: "101" });
  expect(result.status === "success" && result.data.map(row => row.id)).toEqual(["a", "d"]);
});

it("passes a failed read through unchanged", async () => {
  const failure = { status: "error", httpStatus: 503, uncertain: false };
  lookups.loadOptions.mockResolvedValue(failure);
  expect(await loadInUseZones(new AbortController().signal)).toBe(failure);
});
