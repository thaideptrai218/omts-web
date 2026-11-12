/** Shared jsdom gaps: jsdom ships no ResizeObserver, but the lane detail popover observes its own size. */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
