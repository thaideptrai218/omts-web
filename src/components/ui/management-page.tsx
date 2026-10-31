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
    <header className="management-heading flex min-w-0 flex-col gap-5 pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary sm:flex">
          <InterfaceIcon name={icon} className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-text [overflow-wrap:anywhere] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-muted">
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
    <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-card border border-border bg-surface">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col items-start gap-2 px-3 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
        >
          <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-surface-subtle text-primary sm:grid">
            <InterfaceIcon name={item.icon} />
          </span>
          <div className="w-full min-w-0">
            <dt className="min-h-10 text-xs leading-5 text-text-muted sm:min-h-0 sm:text-sm">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-text">
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
      ? "bg-success/10 text-success"
      : tone === "danger"
        ? "bg-danger/10 text-danger"
        : "bg-surface-subtle text-text-muted";
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
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
