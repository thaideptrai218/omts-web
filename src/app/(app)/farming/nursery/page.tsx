import { Suspense } from "react";
import { ApiPage } from "@/features/api-workspace/api-page";
import { NurseryScreen } from "@/features/nursery-api/nursery-screen";
import { Skeleton } from "@/features/operations/ui";

export const metadata = { title: "Ươm giống | HTX Trung Nam" };
export const instant = false;
export default function NurseryPage() {
  return <ApiPage api={<Suspense fallback={<Skeleton />}><NurseryScreen /></Suspense>}><p role="status">Không kết nối được dữ liệu ươm giống. Hãy đăng nhập vào hệ thống để xem và ghi nhận.</p></ApiPage>;
}
