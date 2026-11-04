import type { ReactNode } from "react";
import { InterfaceIcon, type InterfaceIconName } from "./interface-icon";

export function ManagementHeading({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: InterfaceIconName;
  children?: ReactNode;
}) {
  return (
    <header className="management-heading flex min-w-0 flex-col gap-4 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5"><InterfaceIcon name={icon} className="size-[18px] shrink-0 text-[#75857b]" /><h1 className="text-[1.5rem] font-semibold tracking-[-.035em] text-text [overflow-wrap:anywhere] sm:text-[1.65rem]">
            {title}
          </h1></div>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-text-muted">
            {description}
          </p>
        </div>
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {children}
        </div>
      )}
    </header>
  );
}

type SummaryItem = Readonly<{
  label: string;
  value: number;
  icon: InterfaceIconName;
}>;

export function ManagementSummary({
  items,
}: {
  items: readonly SummaryItem[];
}) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-card bg-[#e8f2f3] shadow-card">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex min-w-0 flex-col items-start gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5 ${index === 0 ? "bg-[#10243a]" : ""}`}
        >
          <span className={`hidden size-10 shrink-0 place-items-center rounded-control sm:grid ${index === 0 ? "bg-white/10 text-[#a7e0dc]" : "bg-white text-primary"}`}>
            <InterfaceIcon name={item.icon} />
          </span>
          <div className="w-full min-w-0">
            <dt className={`min-h-10 text-xs leading-5 sm:min-h-0 sm:text-sm ${index === 0 ? "text-[#c5dce1]" : "text-text-muted"}`}>
              {item.label}
            </dt>
            <dd className={`mt-0.5 font-mono text-xl font-semibold tabular-nums sm:text-2xl ${index === 0 ? "text-white" : "text-text"}`}>
              {item.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function PersonAvatar({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const initials = [words[0], words.length > 1 ? words.at(-1) : undefined]
    .filter(Boolean)
    .map((word) => word![0])
    .join("");
  return (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary-soft font-semibold text-primary"
    >
      {initials}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "danger" | "neutral";
}) {
  const color =
    tone === "success"
      ? "border-success/25 bg-success/10 text-success"
      : tone === "danger"
        ? "border-danger/25 bg-danger/10 text-danger"
        : "border-border bg-surface-subtle text-text-muted";
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-control border px-2 py-1 text-xs font-semibold ${color}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function DirectoryEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-subtle text-primary">
        <InterfaceIcon name="search" className="size-6" />
      </span>
      <h3 className="mt-4 font-semibold text-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">
        {description}
      </p>
    </div>
  );
}

export const directoryRowStyles =
  "group w-full min-w-0 px-4 py-4 text-left transition-colors duration-200 hover:bg-primary-soft/40 sm:px-6";
