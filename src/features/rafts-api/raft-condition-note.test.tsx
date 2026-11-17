// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RaftConditionNoteCard, RaftConditionNoteField } from "./raft-condition-note";

afterEach(cleanup);

it("shows a labelled note card and an empty state when nothing was written", () => {
  const { rerender } = render(<RaftConditionNoteCard value="Phao còn tốt" />);
  expect(screen.getByText("Tình trạng bè")).toBeTruthy();
  expect(screen.getByText("Phao còn tốt")).toBeTruthy();
  rerender(<RaftConditionNoteCard value="  " />);
  expect(screen.getByText("Chưa ghi tình trạng")).toBeTruthy();
});

it("keeps the conditionNotes field name, a helper line and a live character counter", () => {
  function Editor() {
    const [value, setValue] = useState("");
    return <RaftConditionNoteField value={value} onChange={event => setValue(event.target.value)} />;
  }
  render(<Editor />);
  const box = screen.getByLabelText("Tình trạng bè") as HTMLTextAreaElement;
  expect(box.name).toBe("conditionNotes");
  expect(box.maxLength).toBe(1000);
  expect(box.getAttribute("aria-describedby")).toBeTruthy();
  expect(screen.getByText("0/1000")).toBeTruthy();
  fireEvent.change(box, { target: { value: "Neo lỏng" } });
  expect(screen.getByText("8/1000")).toBeTruthy();
});
