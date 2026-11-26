import Link from "next/link";
import type { ReactNode } from "react";
import { InterfaceIcon, type InterfaceIconName } from "@/components/ui/interface-icon";
import local from "./zone-tabs.module.css";

/** Left-side footer action that opens another screen: text plus icon, no frame (DESIGN_GUIDELINES 1.6). */
export function FooterLink({ href, icon, children }: { href: string; icon: InterfaceIconName; children: ReactNode }) {
  return <Link className={local.footLink} href={href}><InterfaceIcon name={icon} className="size-4" />{children}</Link>;
}
