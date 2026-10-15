import { notFound } from "next/navigation";

import { VerificationShowcase } from "@/features/verification/components/verification-showcase";

export default function VerificationShowcasePage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <VerificationShowcase />;
}
