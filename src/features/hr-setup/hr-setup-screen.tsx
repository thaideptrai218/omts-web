"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { OperationHeading } from "@/features/operations/ui";
import { WorkforceSetupDialog } from "@/features/operations/workforce-setup-dialog";
import { PayrollSettingsDialog } from "./payroll-settings-dialog";
import styles from "./hr-setup.module.css";
import { useHrSetupStatus, type SetupStatus } from "./use-hr-setup-status";

type Target = { href: string } | { dialog: "attendance" | "payroll-settings" };
const STEPS: Record<SetupStatus["key"], { title: string; hint: string; action: string; target: Target }> = {
  employees: { title: "Nhân viên", hint: "Thêm hồ sơ người lao động, vùng làm việc và loại công việc.", action: "Thiết lập", target: { href: "/workspace/employees" } },
  "job-types": { title: "Loại công việc và đơn giá", hint: "Mỗi loại việc cần đơn giá theo giờ để tính lương.", action: "Thiết lập", target: { href: "/operations/job-types" } },
  attendance: { title: "Chấm công", hint: "Giờ nghỉ và mức làm tròn khi tính giờ công.", action: "Thiết lập", target: { dialog: "attendance" } },
  "payroll-settings": { title: "Kỳ lương", hint: "Ngày bắt đầu kỳ lương hằng tháng và các kỳ tiếp theo.", action: "Thiết lập", target: { dialog: "payroll-settings" } },
  payroll: { title: "Bảng lương", hint: "Tạo bảng lương đầu tiên cho một kỳ có chấm công.", action: "Tạo bảng lương", target: { href: "/operations/payroll" } },
};

function Card({ status, onOpen }: Readonly<{ status: SetupStatus; onOpen(dialog: "attendance" | "payroll-settings"): void }>) {
  const step = STEPS[status.key];
  const state: { label: string; tone: "success" | "neutral" | "danger" } = status.loading ? { label: "Đang tải", tone: "neutral" } : status.error ? { label: "Chưa tải được", tone: "danger" } : status.done ? { label: "Đã xong", tone: "success" } : { label: "Chưa thiết lập", tone: "neutral" };
  const action: ReactNode = "href" in step.target
    ? <Link className={styles.action} href={step.target.href}>{step.action}</Link>
    : <Button className="w-auto" variant="secondary" onClick={() => onOpen((step.target as { dialog: "attendance" | "payroll-settings" }).dialog)}>{step.action}</Button>;
  return (
    <li className={styles.card} aria-busy={status.loading}>
      <div className={styles.cardHead}><h2>{step.title}</h2><StatusPill tone={state.tone}>{state.label}</StatusPill></div>
      <p className={styles.hint}>{step.hint}</p>
      {status.loading ? <div className={styles.skeleton} role="status" aria-label={`Đang tải ${step.title}`} />
        : status.error ? <p role="alert" className={styles.error}>{status.error} <button type="button" className={styles.link} onClick={status.reload}>Tải lại</button></p>
        : <p className={styles.summary}>{status.summary}</p>}
      <div className={styles.cardFoot}>{action}</div>
    </li>
  );
}

/**
 * Thiết lập nhân sự (kiểu danh sách việc của KiotViet): năm bước, mỗi bước cho biết đã xong chưa theo dữ liệu thật và mở đúng màn hoặc hộp thoại.
 * Chỉ phản ánh dữ liệu đang có; không lưu trạng thái hoàn thành riêng.
 */
export function HrSetupScreen() {
  const steps = useHrSetupStatus();
  const [dialog, setDialog] = useState<"attendance" | "payroll-settings">();
  const loaded = steps.filter((step) => !step.loading && !step.error).length, done = steps.filter((step) => step.done).length;
  const close = (key: SetupStatus["key"]) => { setDialog(undefined); steps.find((step) => step.key === key)?.reload(); };
  return (
    <section>
      <OperationHeading title="Thiết lập nhân sự" description="Hoàn tất các bước để chấm công và tính lương chạy đúng." icon="list" />
      <div className={styles.progress} role="group" aria-label="Tiến độ thiết lập">
        <strong>{loaded === steps.length ? `${done}/${steps.length} bước đã xong` : "Đang kiểm tra các bước..."}</strong>
        <div className={styles.bar} role="progressbar" aria-label="Số bước đã xong" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}><span style={{ width: `${done / steps.length * 100}%` }} /></div>
      </div>
      <ul className={styles.grid}>{steps.map((status) => <Card key={status.key} status={status} onOpen={setDialog} />)}</ul>
      {dialog === "attendance" && <WorkforceSetupDialog onClose={() => close("attendance")} />}
      {dialog === "payroll-settings" && <PayrollSettingsDialog onClose={() => close("payroll-settings")} onSaved={() => steps.find((step) => step.key === "payroll-settings")?.reload()} />}
    </section>
  );
}
