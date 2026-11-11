// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { OysterMoodProvider, useOysterMood } from "./oyster-mood";
import { AnimatedOyster } from "./animated-oyster";

afterEach(cleanup);

it("keeps the art decorative, unfocusable and free of visible text", () => {
  const { container, queryByRole } = render(<AnimatedOyster />);
  expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("svg")?.getAttribute("focusable")).toBe("false");
  expect(queryByRole("img")).toBeNull();
  expect(container.querySelectorAll("text, a, button, [tabindex]")).toHaveLength(0);
});

it("renders edible shell anatomy without mascot features or a bead", () => {
  const { container } = render(<AnimatedOyster />);
  for (const part of ["outer-shell", "half-shell", "mantle", "flesh"]) {
    expect(container.querySelector(`[data-part="${part}"]`)).not.toBeNull();
  }
  expect(container.innerHTML).not.toMatch(/pearl|blush|smile|eye|face|sparkle|heart/i);
  // Circles are reserved exclusively for the water, never the oyster itself.
  expect(container.querySelectorAll("circle:not([data-part='bubbles'] > circle)")).toHaveLength(0);
  const source = readFileSync("src/components/brand/oyster-artwork.tsx", "utf8");
  expect(source).not.toMatch(/#(?:f5c8be|d89191|b97f88|f9ded3|eda5a1|fff1de)/i);
});

it("uses twenty varied staggered bubbles and isolates gradient IDs per instance", () => {
  const { container } = render(<><AnimatedOyster /><AnimatedOyster /></>);
  const svgs = container.querySelectorAll("svg");
  for (const svg of svgs) {
    const bubbles = svg.querySelectorAll<SVGCircleElement>('[data-part="bubbles"] > circle');
    expect(bubbles).toHaveLength(20);
    expect(new Set(Array.from(bubbles, (bubble) => bubble.getAttribute("style"))).size).toBe(bubbles.length);
    for (const bubble of bubbles) {
      expect(Number.parseFloat(bubble.style.animationDuration)).toBeGreaterThanOrEqual(5.5);
      expect(Number.parseFloat(bubble.style.animationDuration)).toBeLessThanOrEqual(14);
      expect(Number.parseFloat(bubble.style.animationDelay)).toBeLessThan(0);
    }
    for (const element of svg.querySelectorAll('[fill^="url("]')) {
      const id = element.getAttribute("fill")!.slice(5, -1);
      expect(Array.from(svg.querySelectorAll("[id]")).some((definition) => definition.id === id)).toBe(true);
    }
  }
  const ids = Array.from(container.querySelectorAll("[id]"), (element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("disables all motion and retains a finished static composition", () => {
  // jsdom cannot play CSS animations or emulate media queries. Check the actual
  // stylesheet contract, including the light rays, rather than matchMedia mocks.
  const css = readFileSync("src/components/brand/animated-oyster.module.css", "utf8");
  const reduced = css.split("@media (prefers-reduced-motion: reduce)")[1];
  expect(reduced).toMatch(/\.root\s+\*\s*\{\s*animation:\s*none;/);
  expect(reduced).toMatch(/\.drift,\s*\.bubble\s*\{\s*transform:\s*none;/);
  expect(reduced).toMatch(/\.bubble\s*\{\s*opacity:\s*\.18;/);
  expect(reduced).toMatch(/\.rays\s*\{\s*opacity:\s*\.6;/);
  expect(css).toContain("drift 7.2s infinite");
  expect(reduced).toContain("transition:none");
  expect(css).toContain('transform-origin:154px 246px');
  expect(css).toContain('rotate(-33deg)');
});


it("reflects the provider mood and retains a landscape scene", () => {
  function Controls() {
    const { setMood } = useOysterMood();
    return <><button onClick={() => setMood("closed")}>Close</button><button onClick={() => setMood("open")}>Open</button><button onClick={() => setMood("idle")}>Rest</button></>;
  }
  const { container, getByText } = render(<OysterMoodProvider><AnimatedOyster/><Controls/></OysterMoodProvider>);
  const art = container.querySelector('[data-mood]');
  expect(art?.getAttribute("data-mood")).toBe("idle");
  for (const [label, mood] of [["Close", "closed"], ["Open", "open"], ["Rest", "idle"]]) {
    fireEvent.click(getByText(label));
    expect(art?.getAttribute("data-mood")).toBe(mood);
  }
  expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 600 400");
  expect(container.querySelectorAll('[data-part="plankton"] > path')).toHaveLength(5);
});

it("keeps desktop sizing shrinkable and the artwork bounded by both dimensions", () => {
  const layout = readFileSync("src/components/layout/auth-shell.module.css", "utf8");
  const art = readFileSync("src/components/brand/animated-oyster.module.css", "utf8");
  expect(layout).toContain("height:100dvh; min-height:0; grid-template-rows:minmax(0,1fr)");
  expect(layout).toContain("flex:1; min-height:0; container-type:size");
  expect(layout).not.toMatch(/min-height:(290px|calc\(100dvh)/);
  expect(art).toContain("width:min(100%, 150cqh); height:auto; max-height:100%; aspect-ratio:3/2");
});
