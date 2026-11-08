import { PurchaseRequestDetailPage } from "@/features/operations/new-module-screens";

export const metadata = { title: "Chi tiết yêu cầu mua | HTX Trung Nam" };
export const instant = false;

export default async function PurchaseRequestDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseRequestDetailPage id={id} />;
}
