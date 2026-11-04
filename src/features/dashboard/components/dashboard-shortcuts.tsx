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
      className="min-w-0 rounded-card border border-border bg-white px-5 py-4"
    >
      <p className="text-[11px] font-medium text-text-muted">Theo quyền truy cập</p>
      <h2 className="mt-1 text-base font-semibold tracking-tight text-text">Công việc của bạn</h2>
      <ul className="mt-2 divide-y divide-border/70 border-t border-border/70">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={item.description}
              className="group flex min-h-11 min-w-0 items-center gap-3 px-0 py-2 text-[13px] font-medium text-text transition-colors hover:text-primary"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-control bg-[#f5f7f3] text-[#6c7f72]"><InterfaceIcon name={item.icon} className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block font-medium">{item.label}</span><span className="block text-[11px] leading-4 font-normal text-text-muted">{item.description}</span></span>
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
