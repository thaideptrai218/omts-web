// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { waterFixture } from "./__tests__/fixtures";
import { WaterMeasurementInfoTab } from "./water-measurement-info-tab";

afterEach(cleanup);

it("tells in Vietnamese which values were outside their thresholds, never the backend English sentence", () => {
  const record = waterFixture({ ph: 14, salinity: 10, temperature: 40, thresholdExceeded: true, alertState: "Active",
    violatedValues: "pH 14.00 > 8.50; Salinity 10.00 < 18.00; Temperature 40.00 > 32.00" });
  render(<WaterMeasurementInfoTab record={record} zoneName="Vùng QA" canChange={false} busy={false} onVoid={() => undefined} />);
  const alert = screen.getByRole("alert").textContent;
  expect(alert).toBe("Vượt ngưỡng: pH 14 cao hơn mức cho phép 8,5 · Độ mặn 10 ‰ thấp hơn mức cho phép 18 ‰ · Nhiệt độ 40 °C cao hơn mức cho phép 32 °C");
  expect(document.body.textContent).not.toMatch(/Salinity|Temperature/);
});

it("shows no alert line for a measurement inside its thresholds", () => {
  render(<WaterMeasurementInfoTab record={waterFixture()} zoneName="Vùng QA" canChange={false} busy={false} onVoid={() => undefined} />);
  expect(screen.queryByRole("alert")).toBeNull();
});
