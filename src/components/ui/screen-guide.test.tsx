// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScreenGuide } from "./screen-guide";

const steps = [{ title: "Chọn vùng", text: "Chọn vùng cần xem." }, { title: "Bấm ô", text: "Bấm ô để phân công." }];

describe("ScreenGuide", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows the numbered steps the first time", () => {
    render(<ScreenGuide id="t1" steps={steps} />);
    expect(screen.getByRole("heading", { name: "Bắt đầu từ đây" })).toBeTruthy();
    expect(screen.getByText("Chọn vùng")).toBeTruthy();
  });

  it("folds to a link that brings it back, and remembers the choice per screen", () => {
    const first = render(<ScreenGuide id="t2" steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: "Ẩn hướng dẫn" }));
    expect(screen.queryByText("Chọn vùng")).toBeNull();
    first.unmount();
    render(<ScreenGuide id="t2" steps={steps} />);
    expect(screen.queryByText("Chọn vùng")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem hướng dẫn" }));
    expect(screen.getByText("Chọn vùng")).toBeTruthy();
  });

  it("starts folded on a phone-sized screen unless the user opened it on purpose", () => {
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    try {
      const small = render(<ScreenGuide id="t4" steps={steps} />);
      expect(screen.queryByText("Chọn vùng")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Xem hướng dẫn" }));
      expect(screen.getByText("Chọn vùng")).toBeTruthy();
      small.unmount();
      render(<ScreenGuide id="t4" steps={steps} />);
      expect(screen.getByText("Chọn vùng")).toBeTruthy();
    } finally { Object.defineProperty(window, "innerWidth", { configurable: true, value: original }); }
  });

  it("keeps another screen's guide open", () => {
    window.localStorage.setItem("omts.guide.other.dismissed", "1");
    render(<ScreenGuide id="t3" steps={steps} />);
    expect(screen.getByText("Bấm ô")).toBeTruthy();
  });
});


