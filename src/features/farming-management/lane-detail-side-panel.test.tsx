// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LaneOverview } from "./lane-overview";

afterEach(cleanup);
const lanes = [1, 2, 3].map(laneNumber => ({ laneNumber, state: "NotSeeded" }));
const column = (number: number) => screen.getByRole("button", { name: new RegExp(`^Làn ${number}:`) });

describe("lane overview with a side detail panel", () => {
  it("opens the lane details beside the strip instead of in a popover over the dialog", async () => {
    const { container } = render(<LaneOverview lanes={lanes} detailPlacement="side" renderLaneDetails={lane => <p>Chi tiết làn {lane.laneNumber}</p>} />);
    fireEvent.click(column(2));
    expect(await screen.findByText("Chi tiết làn 2")).toBeTruthy();
    expect(container.ownerDocument.querySelector("[popover]")).toBeNull();
    expect(container.ownerDocument.querySelector("[data-lane-detail-panel]")?.textContent).toContain("Chi tiết làn 2");
    expect(column(2).getAttribute("aria-haspopup")).toBeNull();
    // Another lane replaces the details; the panel is closed from its own button.
    fireEvent.click(column(3));
    expect(await screen.findByText("Chi tiết làn 3")).toBeTruthy();
    expect(screen.queryByText("Chi tiết làn 2")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đóng chi tiết làn 3" }));
    expect(screen.queryByText("Chi tiết làn 3")).toBeNull();
  });

  it("marks only chosen lanes as ticked; the lane whose details are open gets its own marker", () => {
    render(<LaneOverview lanes={lanes} selected={[1]} opened={2} detailPlacement="side" />);
    expect(column(1).getAttribute("aria-pressed")).toBe("true");
    expect(column(1).textContent).toContain("✓");
    expect(column(2).getAttribute("aria-pressed")).toBe("false");
    expect(column(2).textContent).not.toContain("✓");
    expect(column(2).hasAttribute("data-opened")).toBe(true);
  });
});
