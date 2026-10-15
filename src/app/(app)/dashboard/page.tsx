import type { Metadata } from "next";
import { DashboardExperience } from "@/features/dashboard/components/dashboard-experience";

export const metadata: Metadata = {
  title: "Tổng quan | OMTS",
};

export default function DashboardPage() {
  return <DashboardExperience />;
}
