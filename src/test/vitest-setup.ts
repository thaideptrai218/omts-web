/** Shared jsdom gaps: jsdom ships no ResizeObserver, but the lane detail popover observes its own size. */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * jsdom hides every `[popover]` element (its default stylesheet says `:not(:popover-open) { display: none }`) but implements neither
 * `showPopover()` nor `:popover-open`, so a panel the components open would stay invisible to role queries. Browsers show it in the top layer;
 * here the components only render a popover while it is open, so showing every one matches what a user sees.
 */
if (typeof document !== "undefined" && typeof HTMLElement.prototype.showPopover !== "function") {
  const style = document.createElement("style");
  style.textContent = "[popover] { display: block !important; }";
  document.head.append(style);
}
