// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { raftFixture } from "@/features/farming-api/fixtures";
import { projectResource } from "@/features/api-workspace/resources";
import { areaOf, raftGeometryRequest } from "./raft-geometry";
import { emptyRaftDraft, parseRaftDetail, raftBody, raftDraftOf, validateRaftDraft, type RaftDraft } from "./raft-model";
import { RaftGeometryFields } from "./raft-geometry-fields";
import { RaftLaneDiagram } from "./raft-lane-diagram";
afterEach(cleanup);
const valid = { ...emptyRaftDraft, code: "B01", lengthM: "24", widthM: "10", size: "24 m x 10 m", laneCount: "3" };

it("rounds area and rejects geometry bounds, excess precision and oversized lane ropes", () => {
  expect(areaOf(12.35, 2.25)).toBe(27.79);
  expect(validateRaftDraft(valid)).toEqual({});
  for (const values of [{ lengthM: "501" }, { widthM: "201" }, { lengthM: "0.99" }, { lengthM: "12.345" }, { laneLines: '{"2":"25"}' }])
    expect(validateRaftDraft({ ...valid, ...values })).toHaveProperty("size");
  expect(validateRaftDraft({ ...valid, laneCount: "201" })).toHaveProperty("laneCount");
  expect(raftGeometryRequest.safeParse({ lengthM: 24, laneLengths: [{ laneNumber: 1, lineLengthM: 12 }, { laneNumber: 1, lineLengthM: 10 }] }).success).toBe(false);
});
it("sends legacy text with new numeric geometry and override/reset values, never area", () => {
  const body = raftBody({ ...valid, laneLines: '{"2":"18.5","3":""}' }, "v1");
  expect(body).toMatchObject({ size: "24 m x 10 m", lengthM: 24, widthM: 10, laneLengths: [{ laneNumber: 2, lineLengthM: 18.5 }, { laneNumber: 3, lineLengthM: null }], rowVersion: "v1" });
  expect(body).not.toHaveProperty("areaM2");
});
it("accepts old responses and preserves new optional geometry through both projections", () => {
  const old = raftFixture();
  expect(parseRaftDetail(old)).toBeTruthy();
  const next = { ...old, lengthM: 24, widthM: 10, areaM2: 240, lanes: old.lanes.map(lane => ({ ...lane, lineLengthM: 18.5, isDamaged: true })) };
  expect(parseRaftDetail(projectResource("rafts", next, true))).toMatchObject({ lengthM: 24, lanes: [{ lineLengthM: 18.5, isDamaged: true }] });
  expect(raftBody(raftDraftOf(next))).toMatchObject({ laneLengths: [{ laneNumber: 1, lineLengthM: 18.5 }] });
});
function Editor({ locked }: { locked?: string }) {
  const [draft, setDraft] = useState<RaftDraft>(valid);
  return <form><RaftGeometryFields draft={draft} setDraft={setDraft} laneCountLocked={locked} /><output data-testid="body">{JSON.stringify(raftBody(draft))}</output></form>;
}
it("shows live read-only area and uses explicit non-submit stepper/reset buttons", () => {
  render(<Editor />);
  const area = screen.getByLabelText("Diện tích");
  expect(area.tagName).toBe("OUTPUT"); expect(area.textContent).toContain("240");
  fireEvent.change(screen.getByLabelText("Chiều rộng bè *"), { target: { value: "12" } });
  expect(area.textContent).toContain("288");
  const add = screen.getByRole("button", { name: "Thêm làn cuối" }); expect(add.getAttribute("type")).toBe("button");
  fireEvent.click(add); expect((screen.getByLabelText("Số làn *") as HTMLInputElement).value).toBe("4");
  fireEvent.click(screen.getByText("Độ dài từng làn (tùy chọn)"));
  fireEvent.change(screen.getByLabelText("Độ dài làn 1"), { target: { value: "18" } });
  const reset = screen.getAllByRole("button", { name: "Theo bè" })[0]; expect(reset.getAttribute("type")).toBe("button");
  fireEvent.click(reset); expect((screen.getByLabelText("Độ dài làn 1") as HTMLInputElement).value).toBe("24");
  expect(screen.getByTestId("body").textContent).toContain('"lineLengthM":null');
});
it("locks manual count and both steppers with the actual cycle reason", () => {
  render(<Editor locked="Bè có chu kỳ đang mở." />);
  expect((screen.getByLabelText("Số làn *") as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Thêm làn cuối" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Bớt làn cuối" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Bè có chu kỳ đang mở.")).toBeTruthy();
});
it("keeps damage/inactive status readable even on the shortest lane", () => {
  render(<RaftLaneDiagram length={500} lanes={[{ laneNumber: 3, lineLengthM: 1, isDamaged: true }, { laneNumber: 5, lineLengthM: 2, statusId: 2002 }]} />);
  // The state is named on the column itself (and again by the filter chip and legend), so address the column.
  expect(screen.getByRole("button", { name: /^Làn 3: Hỏng/ })).toBeTruthy(); expect(screen.getByRole("button", { name: /^Làn 5: Ngừng hoạt động/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Làn 1:/ })).toBeNull();
});
