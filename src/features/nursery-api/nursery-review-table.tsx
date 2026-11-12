import type { ReactNode } from "react";
export function NurseryReviewTable({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return <dl className="my-3 divide-y divide-border rounded-control border border-border">{rows.map(([label, value]) =>
    <div key={label} className="grid gap-1 p-3 text-sm sm:grid-cols-2"><dt className="text-text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl>;
}
