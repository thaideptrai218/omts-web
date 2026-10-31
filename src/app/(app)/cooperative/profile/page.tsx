import type { Metadata } from "next";
import { CooperativeProfileExperience } from "@/features/cooperative-profile/components/cooperative-profile-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiSingletonScreen } from "@/features/api-workspace/api-singleton-screen";

export const metadata: Metadata = {
  title: "Hồ sơ hợp tác xã | OMTS",
};

export default function CooperativeProfilePage() {
  return <ApiPage api={<ApiSingletonScreen kind="cooperative" />}><CooperativeProfileExperience /></ApiPage>;
}
