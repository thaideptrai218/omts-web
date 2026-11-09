"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import type { InterfaceIconName } from "@/components/ui/interface-icon";
import { OperationHeading } from "@/features/operations/ui";
import s from "./report-frame.module.css";

type ReportScreenShellProps = Readonly<{
  title: string;
  description: string;
  icon: InterfaceIconName;
  /** Filter fields rendered in the left rail below the export button. */
  filters: ReactNode;
  /** Report body: period line, summary tiles, chart and tables. */
  children: ReactNode;
}>;

/** Report layout: heading, left filter rail with a disabled export button, and a results column. */
export function ReportScreenShell({ title, description, icon, filters, children }: ReportScreenShellProps) {
  return (
    <section>
      <OperationHeading title={title} description={description} icon={icon} />
      <FilterWorkspace
        label="Bộ lọc báo cáo"
        filters={
          <form className={s.form} onSubmit={(event) => event.preventDefault()}>
            {/* TODO(api): enable and wire to the report export endpoint. */}
            <Button type="button" variant="secondary" disabled aria-disabled="true">Xuất file</Button>
            {filters}
          </form>
        }
      >
        <div className={s.stack}>{children}</div>
      </FilterWorkspace>
    </section>
  );
}
