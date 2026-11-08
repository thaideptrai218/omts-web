"use client";
import { useEffect, useRef, useState } from "react";

export const SIDEBAR_OPEN_DELAY = 160;
export const SIDEBAR_CLOSE_DELAY = 280;

// One state drives both the reserved column and its labels. Hover intent avoids
// expanding while the pointer merely crosses the rail on its way to the page.
export function useSidebarExpansion() {
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function cancelTimer() {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }
  useEffect(() => () => cancelTimer(), []);
  const expanded = pinned || hovered || focused;
  return {
    expanded,
    pinned,
    toggleLabel: pinned
      ? "Thu gọn menu"
      : expanded
        ? "Giữ menu mở"
        : "Mở rộng menu",
    toggle() {
      cancelTimer();
      setPinned(!pinned);
      setHovered(false);
      setFocused(false);
    },
    enter() {
      cancelTimer();
      if (!pinned)
        timer.current = setTimeout(() => setHovered(true), SIDEBAR_OPEN_DELAY);
    },
    leave() {
      cancelTimer();
      timer.current = setTimeout(() => setHovered(false), SIDEBAR_CLOSE_DELAY);
    },
    focus() {
      setFocused(true);
    },
    blur() {
      setFocused(false);
    },
  };
}
