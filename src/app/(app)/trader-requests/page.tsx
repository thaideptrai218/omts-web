import { ApiPage } from "@/features/api-workspace/api-page";
import { TraderRequestsPage } from "@/features/trader-requests-api/requests-dialog";
export const metadata = { title: "Yêu cầu đăng ký thương lái | HTX Trung Nam" };
export default function Page() { return <ApiPage api={<TraderRequestsPage />}><p>Chức năng này cần kết nối hệ thống dữ liệu hợp tác xã.</p></ApiPage>; }
