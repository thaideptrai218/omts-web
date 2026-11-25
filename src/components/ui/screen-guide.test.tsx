// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScreenGuide } from "./screen-guide";

const steps = [{ title: "Chọn vùng", text: "Chọn vùng cần xem." }, { title: "Bấm ô", text: "Bấm ô để phân công." }];

describe("ScreenGuide", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("is only a small button until it is opened, so it takes no room from the screen", () => {
    render(<ScreenGuide id="t1" steps={steps} />);
    expect(screen.getByRole("button", { name: "Xem hướng dẫn" })).toBeTruthy();
    expect(screen.queryByText("Chọn vùng")).toBeNull();
  });

  it("walks through the steps one at a time with Tiếp, Trước and Xong", () => {
    render(<ScreenGuide id="t2" steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: "Xem hướng dẫn" }));
    expect(screen.getByText("Chọn vùng")).toBeTruthy();
    expect(screen.getByText(/Bước 1\/2/)).toBeTruthy();
    expect(screen.queryByText("Bấm ô")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
    expect(screen.getByText("Bấm ô")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Trước" }));
    expect(screen.getByText("Chọn vùng")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
    fireEvent.click(screen.getByRole("button", { name: "Xong" }));
    expect(screen.queryByText("Bấm ô")).toBeNull();
  });

  it("closes with the cross and with Escape, and starts from step 1 when opened again", () => {
    render(<ScreenGuide id="t3" steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: "Xem hướng dẫn" }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem hướng dẫn" }));
    expect(screen.getByText(/Bước 1\/2/)).toBeTruthy();
  });

  it("remembers per screen that the guide was opened, and shows nothing for a guide without steps", () => {
    render(<ScreenGuide id="t4" steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: "Xem hướng dẫn" }));
    expect(window.localStorage.getItem("omts.guide.t4.seen")).toBe("1");
    expect(window.localStorage.getItem("omts.guide.other.seen")).toBeNull();
    cleanup();
    const { container } = render(<ScreenGuide id="t5" steps={[]} />);
    expect(container.textContent).toBe("");
  });
});
