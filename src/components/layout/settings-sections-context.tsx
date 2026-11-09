"use client";
import { createContext, useContext } from "react";
import type { SettingsSection } from "./header-menu";

const SettingsSectionsContext = createContext<readonly SettingsSection[]>([]);

export const SettingsSectionsProvider = SettingsSectionsContext.Provider;

/** The permission-filtered settings destinations AppShell shows in the gear menu. */
export function useSettingsSections(): readonly SettingsSection[] {
  return useContext(SettingsSectionsContext);
}
