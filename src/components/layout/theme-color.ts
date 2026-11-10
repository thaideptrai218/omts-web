"use client";
import { useCallback, useEffect, useState } from "react";

/** Brand colours the user can pick in the account menu ("Chủ đề"). Navy is the management-screen default. */
export const themeColors = [
  { id: "navy", label: "Xanh navy", base: "#315a96", hover: "#294d82", soft: "#edf3fc" },
  { id: "teal", label: "Xanh ngọc", base: "#086f78", hover: "#075961", soft: "#e7f3f3" },
  { id: "blue", label: "Xanh dương", base: "#1d64d8", hover: "#1853b4", soft: "#eaf1fd" },
  { id: "green", label: "Xanh lá", base: "#15803d", hover: "#116632", soft: "#eaf6ee" },
  { id: "purple", label: "Tím", base: "#6d4bc4", hover: "#5a3ca6", soft: "#f1edfb" },
  { id: "orange", label: "Cam", base: "#c2410c", hover: "#a3360a", soft: "#fdf0e9" },
] as const;

export type ThemeColorId = (typeof themeColors)[number]["id"];
const STORAGE_KEY = "omts-theme-color";
const DEFAULT: ThemeColorId = "navy";

/** Sets the brand variables on <html>; the header bar, management screens and primary buttons read them. */
function apply(id: ThemeColorId) {
  const color = themeColors.find((item) => item.id === id) ?? themeColors[0];
  const style = document.documentElement.style;
  style.setProperty("--omts-brand", color.base);
  style.setProperty("--omts-brand-hover", color.hover);
  style.setProperty("--omts-brand-soft", color.soft);
  style.setProperty("--omts-color-primary", color.base);
  style.setProperty("--omts-color-primary-hover", color.hover);
  style.setProperty("--omts-color-primary-soft", color.soft);
}

function stored(): ThemeColorId | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return themeColors.some((item) => item.id === value) ? (value as ThemeColorId) : null;
  } catch {
    return null;
  }
}

/**
 * The chosen colour of this browser; a per-viewer preference, so browser storage is enough. Until someone picks one the
 * page keeps its built-in colours (navy bar and management screens), shown as "Xanh navy".
 */
export function useThemeColor() {
  const [color, setColor] = useState<ThemeColorId>(DEFAULT);
  useEffect(() => {
    const saved = stored();
    if (!saved) return;
    apply(saved);
    // Reads browser storage once after mount; the server render cannot know it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(saved);
  }, []);
  const choose = useCallback((id: ThemeColorId) => {
    setColor(id);
    apply(id);
    try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* storage blocked: the choice lasts for this page only */ }
  }, []);
  return [color, choose] as const;
}
