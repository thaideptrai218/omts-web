import { ProfileExperience } from "@/features/profile/components/profile-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiSingletonScreen } from "@/features/api-workspace/api-singleton-screen";

export const metadata = {
  title: "Hồ sơ cá nhân | OMTS",
};

export default function AccountPage() {
  return <ApiPage api={<ApiSingletonScreen kind="profile" />}><ProfileExperience /></ApiPage>;
}
