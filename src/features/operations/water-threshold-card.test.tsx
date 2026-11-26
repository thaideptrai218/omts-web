// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
const read = vi.hoisted(() => vi.fn());
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read }) }));
import { WaterThresholdCard } from "./water-threshold-card";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const zoneId = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
const answer = { status: "success", data: { zoneId, zoneCode: "Z1", zoneName: "Vùng 1", zoneStatus: "In Use",
  thresholds: { phMin: 7.51, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: null, temperatureMax: null } } };

it("always shows the three thresholds in force, with Sửa ngưỡng only for the owner", async () => {
  read.mockResolvedValue(answer);
  const view = render(<WaterThresholdCard zoneId={zoneId} canEdit />);
  const card = within(await screen.findByRole("region", { name: "Ngưỡng cảnh báo" }));
  expect(await card.findByText("7,51–8,5")).toBeTruthy();
  expect(card.getByText("18–32 ‰")).toBeTruthy();
  expect(card.getByText("Chưa đặt")).toBeTruthy();
  expect(card.getByRole("link", { name: "Sửa ngưỡng" }).getAttribute("href")).toBe("/settings?section=water-thresholds");
  view.rerender(<WaterThresholdCard zoneId={zoneId} canEdit={false} />);
  expect(screen.queryByRole("link", { name: "Sửa ngưỡng" })).toBeNull();
});
