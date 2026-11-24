import { ApiPage } from "@/features/api-workspace/api-page";
import { AttendanceTodayScreen } from "@/features/attendance-today/attendance-today-screen";

export const instant = false;

export default function WorkTodayPage() {
  return <ApiPage api={<AttendanceTodayScreen />}><p role="status">Hãy đăng nhập vào hệ thống để xem chấm công hôm nay.</p></ApiPage>;
}
