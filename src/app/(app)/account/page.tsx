import { ProfileExperience } from "@/features/profile/components/profile-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiSingletonScreen } from "@/features/api-workspace/api-singleton-screen";

export const metadata = {
  title: "Hồ sơ cá nhân | OMTS",
};

// The session guard deliberately omits this segment while authentication is
// unresolved. Validate authorization normally; exempt only this page from the
// dev-only instant-navigation check for an intentionally unrendered segment.
export const instant = false;

export default function AccountPage() {
  return <ApiPage api={<ApiSingletonScreen kind="profile" />}><ProfileExperience /></ApiPage>;
}
