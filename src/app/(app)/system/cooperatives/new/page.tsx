import type { Metadata } from "next";
import { CooperativeProvisioningExperience } from "@/features/cooperative-provisioning/components/cooperative-provisioning-experience";

export const metadata: Metadata = {
  title: "Khởi tạo hợp tác xã | OMTS",
};

export default function NewCooperativePage() {
  return <CooperativeProvisioningExperience />;
}
