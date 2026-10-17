import type { Metadata } from "next";
import { CooperativeProfileExperience } from "@/features/cooperative-profile/components/cooperative-profile-experience";

export const metadata: Metadata = {
  title: "Hồ sơ hợp tác xã | OMTS",
};

export default function CooperativeProfilePage() {
  return <CooperativeProfileExperience />;
}
