import { ApiPage } from "@/features/api-workspace/api-page";
import { ReceivingAccountScreen } from "@/features/bank-api/screen";
export const metadata = { title: "Tài khoản nhận tiền" };
export default function ReceivingBankAccountPage() { return <ApiPage api={<ReceivingAccountScreen />}><p>Chức năng này cần kết nối hệ thống dữ liệu của hợp tác xã.</p></ApiPage>; }
