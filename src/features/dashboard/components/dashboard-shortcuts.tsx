import Link from "next/link";
import {
  InterfaceIcon,
  type InterfaceIconName,
} from "@/components/ui/interface-icon";

export function DashboardShortcuts({
  items,
}: {
  items: readonly {
    href: string;
    label: string;
    description: string;
    icon: InterfaceIconName;
  }[];
}) {
  return (
    <nav
      aria-label="Lối tắt quản trị"
      className="min-w-0 rounded-card border border-border bg-surface p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-text">Truy cập nhanh</h2>
      <ul className="mt-3 divide-y divide-border/70">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={item.description}
              className="group flex min-h-12 min-w-0 items-center gap-3 rounded-control px-2 py-2.5 text-sm font-medium text-text transition-colors hover:bg-primary-soft/50 hover:text-primary"
            >
              <InterfaceIcon
                name={item.icon}
                className="size-4 shrink-0 text-primary"
              />
              <span className="min-w-0 flex-1">{item.label}</span>
              <InterfaceIcon
                name="arrow"
                className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
