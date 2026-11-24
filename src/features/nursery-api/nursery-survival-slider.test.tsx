// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NurserySurvivalSlider, percentToPieces } from "./nursery-survival-slider";

afterEach(cleanup);

describe("survival slider", () => {
  it("turns a percent into pieces within the allowed range", () => {
    expect(percentToPieces(80, 10_000, 0)).toBe(8_000);
    expect(percentToPieces(100, 9_999, 0)).toBe(9_999);
    expect(percentToPieces(10, 1_000, 300)).toBe(300);
  });
  it("shows the percent of the typed pieces and sends the pieces when dragged", () => {
    const change = vi.fn();
    render(<NurserySurvivalSlider quantityIn={10_000} survivors="8500" onSurvivorsChange={change} />);
    const slider = screen.getByRole("slider", { name: "Tỷ lệ sống sót (ước tính)" });
    expect((slider as HTMLInputElement).value).toBe("85");
    expect(screen.getByRole("status").textContent).toContain("85%");
    fireEvent.change(slider, { target: { value: "60" } });
    expect(change).toHaveBeenCalledWith("6000");
  });
  it("cannot go below what was already seeded", () => {
    render(<NurserySurvivalSlider quantityIn={1_000} survivors="500" floor={300} onSurvivorsChange={vi.fn()} />);
    expect((screen.getByRole("slider") as HTMLInputElement).min).toBe("30");
  });
});
