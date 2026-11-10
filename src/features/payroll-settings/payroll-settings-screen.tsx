"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { AttendanceGroup } from "./attendance-group";
import { PayrollPeriodGroup } from "./payroll-period-group";
import s from "./payroll-settings-screen.module.css";

/**
 * Thiết lập kỳ lương: một trang thiết lập gồm hai nhóm (Kỳ lương, Cách tính giờ công), mỗi dòng là tiêu đề + giải thích + ô điều khiển.
 * Backend chỉ cho Chủ hợp tác xã; người khác không gửi yêu cầu nào.
 */
export function PayrollSettingsScreen() {
  const { identity } = useApiWorkspace();
  const allowed = identity.subjectType === "CooperativeOwner";
  return (
    <section className={s.page}>
      <header className={s.title}><InterfaceIcon name="settings" className="size-[18px] shrink-0" /><h1>Thiết lập kỳ lương</h1></header>
      {!allowed ? <p role="alert" className={`${s.error} ${s.denied}`}>Chỉ Chủ hợp tác xã được xem và thay đổi thiết lập kỳ lương.</p>
        : <div className={s.layout}><PayrollPeriodGroup /><AttendanceGroup /></div>}
    </section>
  );
}
