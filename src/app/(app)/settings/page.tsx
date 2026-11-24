import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/settings-page";

export const metadata: Metadata = {
  title: "Cài đặt",
};

// Settings destinations come from the shell, which is authenticated on the client in the mock runtime.
export const instant = false;

export default function SettingsRoute() {
  return <Suspense><SettingsPage /></Suspense>;
}
