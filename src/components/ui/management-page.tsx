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
    <dl className="grid max-w-3xl grid-cols-3 gap-4 py-1 sm:gap-8">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 border-l border-border pl-3 first:border-l-0 first:pl-0 sm:pl-5"
        >
          <div className="w-full min-w-0">
            <dt className="flex min-h-10 items-start gap-1.5 text-xs leading-5 text-text-muted sm:min-h-0">
              <InterfaceIcon name={item.icon} className="mt-0.5 hidden size-3.5 shrink-0 text-text-muted/70 sm:block" />
              {item.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-text sm:text-2xl">
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
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-[#f1f4f0] text-xs font-medium text-[#526b5b]"
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
      ? "border-success/10 bg-success/5 text-success"
      : tone === "danger"
        ? "border-danger/10 bg-danger/5 text-danger"
        : "border-border/60 bg-[#f5f6f5] text-text-muted";
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-1.5 py-0.5 text-[11px] font-medium leading-4 ${color}`}
    >
      <span aria-hidden="true" className="size-1 rounded-full bg-current" />
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
  "group w-full min-w-0 px-4 py-3 text-left transition-colors duration-150 hover:bg-[#f7f9f6] sm:px-5";
