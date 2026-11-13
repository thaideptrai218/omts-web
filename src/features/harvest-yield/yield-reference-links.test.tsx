// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { YieldGroup } from "./contracts";
import { YieldTable } from "./yield-table";

afterEach(cleanup);
it("opens the referenced lot and keeps links to its exact raft, zone and cycle", () => {
  const lot = { id: "lot", lotCode: "LO001", harvestDate: "2026-11-11", inPeriod: true, raftId: "raft", raftCode: "B01", zoneId: "zone", zoneCode: "V01", cycleId: "cycle", status: "Open", estimatedKg: 100, soldKg: 0, lostKg: 0, differenceKg: 100, notFinal: true };
  const group = { key: "group", label: "Bè 01", zoneId: "zone", zoneCode: "V01", raftId: "raft", raftCode: "B01", cycleId: "cycle", cycleStartDate: "2026-10-01", lotCount: 1, estimatedKg: 100, soldKg: 0, lostKg: 0, differenceKg: 100, notFinal: true, lots: [lot] } as unknown as YieldGroup;
  render(<YieldTable groups={[group]} sort={{ key: "label", dir: "asc" }} showZone linkedRecordId="lot" onSort={() => {}} />);
  expect(screen.getByRole("button", { name: /Bè 01/ }).getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("link", { name: /Mở thu hoạch/ }).getAttribute("href")).toBe("/operations/harvest?zoneId=zone&raftId=raft&recordId=lot&search=LO001");
  expect(screen.getByRole("link", { name: "Bè 01" }).getAttribute("href")).toBe("/farming/rafts?zoneId=zone&recordId=raft&search=B01");
  expect(screen.getByRole("link", { name: "V01" }).getAttribute("href")).toBe("/farming/zones?recordId=zone&search=V01");
  expect(screen.getByRole("link", { name: /Chu kỳ/ }).getAttribute("href")).toBe("/farming/cycles?zoneId=zone&raftId=raft&cycleId=cycle");
});
