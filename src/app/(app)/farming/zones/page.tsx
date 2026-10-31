import { FarmingZoneExperience } from "@/features/farming-zones/components/farming-zone-experience";
import { ApiPage } from "@/features/api-workspace/api-page";
import { ApiResourceScreen } from "@/features/api-workspace/api-resource-screen";

export const metadata = { title: "Vùng nuôi" };

export default function FarmingZonesPage() {
  return <ApiPage api={<ApiResourceScreen resource="zones" />}><FarmingZoneExperience /></ApiPage>;
}
