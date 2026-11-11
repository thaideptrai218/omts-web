// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { composeRaftSize, formatRaftSize, parseRaftSize } from "./raft-size";
import { RaftSizeFields } from "./raft-size-fields";

afterEach(cleanup);

describe("raft size text", () => {
  it("parses the shapes people write and composes the backend text", () => {
    expect(parseRaftSize("10 m x 24 m")).toEqual({ length: 10, width: 24 });
    expect(parseRaftSize("10x24")).toEqual({ length: 10, width: 24 });
    expect(parseRaftSize("7,5 m × 12.5 m")).toEqual({ length: 7.5, width: 12.5 });
    expect(parseRaftSize("bè lớn")).toBeUndefined();
    expect(parseRaftSize("0 m x 3 m")).toBeUndefined();
    expect(composeRaftSize("10", "24")).toBe("10 m x 24 m");
    expect(composeRaftSize("7,5", "")).toBe("");
  });
  it("shows the size with units and the area", () => {
    expect(formatRaftSize("10 m x 24 m")).toBe("10 m x 24 m (240 m²)");
    expect(formatRaftSize("bè lớn")).toBe("bè lớn");
    expect(formatRaftSize(null)).toBeNull();
  });
});

describe("raft size inputs", () => {
  it("writes 'a m x b m' only when both sides are filled, each box with its unit", () => {
    const onChange = vi.fn();
    render(<RaftSizeFields value="" onChange={onChange} />);
    expect(screen.getAllByText("m").length).toBeGreaterThanOrEqual(2);
    fireEvent.change(screen.getByLabelText("Chiều dài *"), { target: { value: "10" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    fireEvent.change(screen.getByLabelText("Chiều rộng *"), { target: { value: "24" } });
    expect(onChange).toHaveBeenLastCalledWith("10 m x 24 m");
  });
  it("fills both boxes from a stored size and keeps free text editable with its hint", () => {
    render(<RaftSizeFields value="10 m x 24 m" onChange={vi.fn()} />);
    expect((screen.getByLabelText("Chiều dài *") as HTMLInputElement).value).toBe("10");
    cleanup();
    render(<RaftSizeFields value="bè lớn" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Ví dụ: 10 m x 24 m")).toBeTruthy();
  });
});
