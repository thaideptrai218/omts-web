"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { operationAllowed, operationModules } from "@/features/operations/permissions";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import styles from "@/components/layout/top-shell.module.css";
import { farmingReferenceHref } from "./farming-reference-href";

const steps = [["cultivation-cycles", "cycle"], ["seeding", "seeding"], ["harvest", "harvest"], ["material-usages", "material"], ["water", "water"]] as const;

/** Carry the current raft through the tabs; record IDs belong only to the source screen. */
export function FarmingWorkflowNav({ identity, permissions }: { identity: BrowserIdentityDto; permissions: PermissionProjection }) {
  const pathname = usePathname(), params = useSearchParams();
  if (!pathname.startsWith("/farming/cycles") && !steps.some(([area]) => pathname.startsWith(`/operations/${area}`))) return null;
  const reference = { zoneId: params.get("zoneId"), raftId: params.get("raftId"), cycleId: params.get("cycleId") };
  return <nav className={styles.contextNav} aria-label="Các bước nuôi trồng">{steps.filter(([area]) => operationAllowed(area, identity, permissions.functionPermissions)).map(([area, kind]) => {
    const href = farmingReferenceHref(kind, reference);
    const title = operationModules.find(entry => entry.key === area)!.title;
    return <Link key={area} href={href} aria-current={pathname === href.split("?")[0] ? "page" : undefined}>{title}{area === "material-usages" ? " (tùy chọn)" : ""}</Link>;
  })}</nav>;
}
