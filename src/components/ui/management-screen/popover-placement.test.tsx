// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Popover } from "./time-range-filter";

const ANCHOR = { left: 100, top: 50, right: 300, bottom: 84, width: 200, height: 34, x: 100, y: 50, toJSON: () => ({}) };

function Host() {
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  return <div>
    <span ref={anchor} data-anchor>anchor</span>
    <button type="button" onClick={() => setOpen(true)}>mở</button>
    {open && <Popover anchor={anchor} label="Lịch" placement="below" onClose={() => setOpen(false)}><p>nội dung</p></Popover>}
  </div>;
}

/** A panel whose containing block starts `offset` px right/below the viewport origin, as inside a transformed dialog. */
function mockLayout(offset: { x: number; y: number }) {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(308);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(320);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute("data-anchor")) return ANCHOR as DOMRect;
    const left = (parseFloat(this.style.left) || 0) + offset.x, top = (parseFloat(this.style.top) || 0) + offset.y;
    return { left, top, right: left + 308, bottom: top + 320, width: 308, height: 320, x: left, y: top, toJSON: () => ({}) } as DOMRect;
  });
}

beforeEach(() => { Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 }); Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("popover placement", () => {
  it("drops under the anchor with the left edges aligned", () => {
    mockLayout({ x: 0, y: 0 });
    render(<Host />);
    fireEvent.click(screen.getByText("mở"));
    const panel = screen.getByRole("dialog", { name: "Lịch" });
    expect(panel.style.left).toBe("100px");
    expect(panel.style.top).toBe("88px");
  });

  it("still lands on the anchor when its containing block is not the viewport (inside a dialog)", () => {
    mockLayout({ x: 30, y: 20 });
    render(<Host />);
    fireEvent.click(screen.getByText("mở"));
    const panel = screen.getByRole("dialog", { name: "Lịch" });
    // Visual left = style.left + 30 must equal the anchor's 100; visual top = style.top + 20 must equal 84 + 4.
    expect(panel.style.left).toBe("70px");
    expect(panel.style.top).toBe("68px");
  });
});
