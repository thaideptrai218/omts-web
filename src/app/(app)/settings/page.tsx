import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/settings-page";

export const metadata: Metadata = {
  title: "Thiết lập | HTX Trung Nam",
};

// Settings destinations come from the shell, which is authenticated on the client in the mock runtime.
export const instant = false;

export default function SettingsRoute() {
  return <SettingsPage />;
}
