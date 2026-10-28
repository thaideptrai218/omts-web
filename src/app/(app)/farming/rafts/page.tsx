import { Suspense } from "react";
import { RaftExperience, RaftLoading } from "@/features/rafts/components/raft-experience";

export const metadata = { title: "Bè nuôi" };
export const instant = false;
export default function RaftsPage() {
  return <Suspense fallback={<RaftLoading />}><RaftExperience /></Suspense>;
}
