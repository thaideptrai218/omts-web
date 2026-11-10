// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AnimatedOyster } from "./animated-oyster";

const media = (matches: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query, addEventListener() {}, removeEventListener() {} }));
beforeEach(() => vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("là hình trang trí ẩn khỏi trình đọc màn hình", () => {
  media(false);
  const { container } = render(<AnimatedOyster />);
  expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("svg")).toBeTruthy();
});

it("nghiêng theo con trỏ chuột bằng biến CSS và gỡ bộ lắng nghe khi hủy", () => {
  media(false);
  const add = vi.spyOn(window, "addEventListener"), remove = vi.spyOn(window, "removeEventListener");
  const { container, unmount } = render(<AnimatedOyster />);
  expect(add).toHaveBeenCalledWith("pointermove", expect.any(Function), { passive: true });
  window.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: window.innerWidth, clientY: 0 }));
  expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--px")).toBe("1.000");
  unmount();
  expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
});

it("không lắng nghe chuột khi người dùng bật giảm chuyển động", () => {
  media(true);
  const add = vi.spyOn(window, "addEventListener");
  render(<AnimatedOyster />);
  expect(add).not.toHaveBeenCalledWith("pointermove", expect.anything(), expect.anything());
});
