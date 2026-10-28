import type { Metadata } from "next";
import { CooperativeProvisioningExperience } from "@/features/cooperative-provisioning/components/cooperative-provisioning-experience";
import { ApiPage } from "@/features/api-workspace/api-page";

export const metadata: Metadata = {
  title: "Khởi tạo hợp tác xã | OMTS",
};

export default function NewCooperativePage() {
  return <ApiPage api={<p role="alert">Bạn không có quyền thực hiện chức năng này.</p>}><CooperativeProvisioningExperience /></ApiPage>;
}
