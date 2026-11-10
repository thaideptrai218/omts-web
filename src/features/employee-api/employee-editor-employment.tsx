import { Button } from "@/components/ui/button";
import type { Employee } from "./contracts";
import { dateLabel, employmentLabel } from "./employee-editor-model";
import styles from "./employee-screen.module.css";

export function EmployeeEditorEmployment({ baseline, dirty, disabled, onAction }: {
  baseline: Employee; dirty: boolean; disabled: boolean; onAction(): void;
}) {
  return <div className={styles.employment}>
    <p className="font-semibold">
      {employmentLabel(baseline.status)}
      {baseline.lastWorkingDay ? ` · Ngày nghỉ: ${dateLabel(baseline.lastWorkingDay)}` : ""}
    </p>
    <Button className="mt-3 sm:w-auto" variant="secondary" disabled={disabled} onClick={onAction}>
      {baseline.status === "Employed" ? "Nghỉ việc" : "Cho làm việc lại"}
    </Button>
    {dirty && <p className="mt-3 text-sm text-text-muted">Lưu hoặc hủy bản nháp trước khi đổi tình trạng làm việc.</p>}
  </div>;
}
