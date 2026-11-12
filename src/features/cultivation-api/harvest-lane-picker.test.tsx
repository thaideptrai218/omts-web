// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HarvestLaneChoices } from "./harvest-lane-choices";

afterEach(cleanup);
/** 50 lanes: 1-37 can be harvested (1-30 growing, 31-37 being harvested), 38-40 harvested, 41-44 not seeded, 45-46 damaged, 47-50 out of service. */
const lanes = Array.from({ length: 50 }, (_, index) => {
  const laneNumber = index + 1;
  if (laneNumber <= 30) return { laneNumber, canHarvest: true, state: "Growing" as const };
  if (laneNumber <= 37) return { laneNumber, canHarvest: true, state: "BeingHarvested" as const };
  if (laneNumber <= 40) return { laneNumber, canHarvest: false, state: "Harvested" as const, reasonCode: "AlreadyHarvested" };
  if (laneNumber <= 44) return { laneNumber, canHarvest: false, state: "NotSeeded" as const, reasonCode: "NotSeeded" };
  if (laneNumber <= 46) return { laneNumber, canHarvest: false, isDamaged: true, state: "Growing" as const, reasonCode: "LaneDamaged" };
  return { laneNumber, canHarvest: false, isOutOfService: true, state: "OutOfService" as const };
});
function Harness() {
  const [values, setValues] = useState<number[]>([]);
  return <><HarvestLaneChoices lanes={lanes} values={values} label="Làn thu hoạch *" onChange={setValues} /><output data-testid="chosen">{values.join(",")}</output></>;
}
const cell = (n: number) => screen.getByRole("button", { name: new RegExp(`^Làn ${n}:`) });
const chosen = () => screen.getByTestId("chosen").textContent;

describe("harvest lane picker", () => {
  it("shows only the lanes that can be harvested as compact numbered cells, and a counter", () => {
    render(<Harness />);
    expect(screen.getAllByRole("button", { name: /^Làn \d+:/ })).toHaveLength(37);
    expect(screen.queryByRole("button", { name: /^Làn 38:/ })).toBeNull();
    // The lane number is the first element of the column; the fill and the state follow it.
    expect(cell(1).firstElementChild?.textContent).toBe("1");
    expect(screen.getByText("Đã chọn 0/37 làn")).toBeTruthy();
    expect(screen.queryByText(/Làn chưa thả giống nên chưa thể thu hoạch/)).toBeNull();
  });
  it("reveals the lanes that cannot be harvested, disabled, with the reason in the tooltip and a legend", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Hiện cả làn không thu được (13)" }));
    expect(screen.getAllByRole("button", { name: /^Làn \d+:/ })).toHaveLength(50);
    for (const n of [38, 41, 45, 47]) expect((cell(n) as HTMLButtonElement).disabled).toBe(true);
    expect(cell(41).getAttribute("title")).toContain("Làn chưa thả giống nên chưa thể thu hoạch.");
    expect(cell(45).getAttribute("title")).toContain("Hỏng");
    // The state filter doubles as the legend: one entry per state present on the raft.
    const legend = screen.getByLabelText("Lọc tình trạng làn").textContent ?? "";
    for (const text of ["Đang nuôi", "Đang thu", "Đã thu", "Chưa thả", "Hỏng", "Ngừng hoạt động"]) expect(legend).toContain(text);
  });
  it("selects all harvestable lanes, clears, and compresses the summary", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Chọn tất cả làn thu được" }));
    expect(screen.getByText("Đã chọn 37/37 làn")).toBeTruthy();
    // The picker's own summary; the overview header repeats the range inside a longer sentence.
    expect(screen.getByText(/^· Làn 1–37$/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    expect(chosen()).toBe("");
  });
  it("selects a typed range and reports what it skipped", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Chọn theo dãy"), { target: { value: "1-3, 5, 39, x" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(chosen()).toBe("1,2,3,5");
    expect(screen.getByText(/Không đọc được: x\. Bỏ qua làn không thu được: 39\./)).toBeTruthy();
    expect(screen.getByText("Đã chọn 4/37 làn")).toBeTruthy();
    expect(screen.getByText(/Làn 1–3, 5/)).toBeTruthy();
  });
  it("drops the excluded lanes from a range and shows them in the counter", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Chọn theo dãy"), { target: { value: "1-30" } });
    fireEvent.change(screen.getByLabelText("Bỏ các làn"), { target: { value: "15, 18" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(chosen()?.split(",")).toHaveLength(28);
    expect(chosen()).not.toMatch(/(^|,)(15|18)(,|$)/);
    expect(screen.getByText("Đã chọn 28/37 làn")).toBeTruthy();
    expect(screen.getByText(/^· bỏ: 15, 18$/)).toBeTruthy();
    // Unticking a single lane works at any time too.
    fireEvent.click(cell(20));
    expect(chosen()?.split(",")).toHaveLength(27);
    expect(screen.getByText(/^· bỏ: 15, 18, 20$/)).toBeTruthy();
  });
  it("Enter in the range box applies it without submitting a surrounding form", () => {
    let submitted = false;
    render(<form onSubmit={event => { event.preventDefault(); submitted = true; }}><HarvestLaneChoices lanes={lanes} values={[]} label="Làn" onChange={() => {}} /></form>);
    const input = screen.getByLabelText("Chọn theo dãy");
    fireEvent.change(input, { target: { value: "2" } });
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    expect(submitted).toBe(false);
  });
  it("selects a range with shift-click over the lanes shown", () => {
    render(<Harness />);
    fireEvent.click(cell(3));
    fireEvent.click(cell(7), { shiftKey: true });
    expect(chosen()).toBe("3,4,5,6,7");
    fireEvent.click(cell(5), { shiftKey: true });
    expect(chosen()).toBe("3,4");
  });
});
