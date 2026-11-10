"use client";
import type { ComponentProps } from "react";
import type * as c from "./contracts";
import { Skeleton } from "./ui";
import { WaterHistoryTable } from "./water-history-table";

type WaterHistorySectionProps = Omit<ComponentProps<typeof WaterHistoryTable>, "history"> & {
  history: { data?: c.WaterHistory; loading: boolean };
};

/** "Lịch sử phép đo" block of the water screen: record count + paged history table. */
export function WaterHistorySection({ history, ...tableProps }: WaterHistorySectionProps) {
  return <section aria-labelledby="water-history-heading" className="mt-5 border-t border-border pt-4">
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id="water-history-heading" className="text-base font-semibold tracking-tight">Lịch sử phép đo</h2>
      {history.data && <p className="text-xs text-text-muted">{history.data.total} bản ghi</p>}
    </div>
    {history.loading ? <Skeleton /> : history.data && (
      <WaterHistoryTable history={history.data} {...tableProps} />
    )}
  </section>;
}
