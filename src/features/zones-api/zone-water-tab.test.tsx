// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const reads = vi.hoisted(() => ({ readZoneWater: vi.fn() }));
vi.mock("./zone-summary-reads", () => reads);
import { ZoneWaterTab } from "./zone-water-tab";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const thresholds = { phMin: 6, phMax: 8, salinityMin: 10, salinityMax: 30, temperatureMin: 20, temperatureMax: 35 };
const row = (over: object) => ({ id: "r1", measuredAt: "2026-11-10T08:00:00+07:00", raftId: null, raftCode: "B1", ph: 7, salinity: 20, temperature: 28, status: "Active", statusCode: "ACTIVE", alertState: "Normal", valuesOutside: [], ...over });

it("takes the newest active measurement for 'Lần đo gần nhất', never a voided one", async () => {
  reads.readZoneWater.mockResolvedValue({ status: "success", data: { thresholds, latest: [
    row({ id: "void", raftCode: "B-VOID", measuredAt: "2026-11-11T09:00:00+07:00", statusCode: "VOIDED", alertState: "Voided" }),
    row({ id: "ok", raftCode: "B-ACTIVE" }),
  ] } });
  render(<ZoneWaterTab zoneId="zone" />);
  const heading = await screen.findByRole("heading", { name: "Lần đo gần nhất" });
  const facts = heading.nextElementSibling as HTMLElement;
  expect(within(facts).queryByText("B-VOID")).toBeNull();
  expect(within(facts).getByText("B-ACTIVE")).toBeTruthy();
});
