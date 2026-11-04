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
      className="min-w-0 rounded-card bg-[#e8f2f3] p-5 sm:p-6"
    >
      <p className="text-[.7rem] font-bold uppercase tracking-[.14em] text-primary">Theo quyền truy cập</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">Công việc của bạn</h2>
      <ul className="mt-3 divide-y divide-border/70 border-t border-border/70">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={item.description}
              className="group flex min-h-14 min-w-0 items-center gap-3 px-1 py-2.5 text-sm font-medium text-text transition-colors hover:text-primary"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-white text-primary"><InterfaceIcon name={item.icon} className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{item.label}</span><span className="block text-xs font-normal text-text-muted">{item.description}</span></span>
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
