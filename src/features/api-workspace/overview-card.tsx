"use client";
import type { ReactNode } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { ReportCard } from "@/features/sales-reports/report-parts";
import styles from "./owner-overview.module.css";

/** Trạng thái tải của một nguồn dữ liệu (khớp kết quả `useRemote`). */
export type RemoteView<T> = Readonly<{ data?: T; loading: boolean; error?: string; reload(): void }>;

type Props<T> = Readonly<{ title: string; actions?: ReactNode; remote: RemoteView<T>; children(data: T): ReactNode }>;

/** Thẻ của màn Tổng quan: khung tải lần đầu, lỗi có nút Thử lại, rồi nội dung khi đã có dữ liệu. */
export function OverviewCard<T>({ title, actions, remote, children }: Props<T>) {
  return (
    <ReportCard title={title} actions={actions}>
      {remote.error && <ListStateMessage error={remote.error} onRetry={remote.reload} />}
      {!remote.error && !remote.data && remote.loading && <div className={styles.skeleton} role="status" aria-label={`Đang tải ${title.toLocaleLowerCase("vi")}`} />}
      {!remote.error && remote.data !== undefined && children(remote.data)}
    </ReportCard>
  );
}
