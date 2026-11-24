import { Suspense } from "react";
import { RaftExperience, RaftLoading } from "@/features/rafts/components/raft-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";

export const metadata = { title: "Bè nuôi" };
export const instant = false;
export default function RaftsPage() {
  return <ApiPage api={<ApiResourceScreen resource="rafts" />}><Suspense fallback={<RaftLoading />}><RaftExperience /></Suspense></ApiPage>;
}
