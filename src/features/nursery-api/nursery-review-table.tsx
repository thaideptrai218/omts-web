import type { ReactNode } from "react";
export function NurseryReviewTable({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return <dl className="my-3 divide-y divide-border rounded-control border border-border">{rows.map(([label, value]) =>
    <div key={label} className="grid min-w-0 gap-1 p-3 text-sm sm:grid-cols-2"><dt className="break-words text-text-muted">{label}</dt><dd className="min-w-0 break-words font-medium">{value}</dd></div>)}</dl>;
}
