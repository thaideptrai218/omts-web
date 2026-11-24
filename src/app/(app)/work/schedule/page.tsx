import { ApiPage } from "@/features/api-workspace/api-page";
import { WorkScheduleScreen } from "@/features/work-schedule/work-schedule-screen";

export const instant = false;

export default function WorkSchedulePage() {
  return <ApiPage api={<WorkScheduleScreen />}><section><h1>Lịch làm việc vùng</h1><p>Lịch làm việc vùng sử dụng dữ liệu của hệ thống đang kết nối.</p></section></ApiPage>;
}
