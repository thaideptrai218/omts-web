"use client";
import { createContext } from "react";

/**
 * Provided by the Cài đặt frame, which already has the settings list on the left: a list screen inside it must not add a filter rail
 * beside that list. Its filters stay hidden until "Lọc" is pressed and then take the settings list's place.
 */
export type SettingsFilterSlot = Readonly<{
  /** The element in the sidebar column the filter panel renders into. */
  column: HTMLElement | null;
  /** Hides (true) or brings back (false) the settings list. Must be stable between renders. */
  setFiltering(filtering: boolean): void;
}>;

export const SettingsFilterSlotContext = createContext<SettingsFilterSlot | null>(null);
