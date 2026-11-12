"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { operationAllowed, operationModules } from "@/features/operations/permissions";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import styles from "@/components/layout/top-shell.module.css";
import { farmingReferenceHref } from "./farming-reference-href";

/** The farming journey in order. Nursery shares the cultivation-cycle permission and has its own route. */
const steps = [
  { area: "cultivation-cycles", kind: "nursery", title: "Ươm giống", path: "/farming/nursery" },
  { area: "cultivation-cycles", kind: "cycle", title: "Chu kỳ nuôi", path: "/farming/cycles" },
  { area: "seeding", kind: "seeding", path: "/operations/seeding" },
  { area: "harvest", kind: "harvest", path: "/operations/harvest" },
  { area: "material-usages", kind: "material", path: "/operations/material-usages" },
  { area: "water", kind: "water", path: "/operations/water" },
] as const;

/** Carry the current raft through the tabs; record IDs belong only to the source screen. */
export function FarmingWorkflowNav({ identity, permissions }: { identity: BrowserIdentityDto; permissions: PermissionProjection }) {
  const pathname = usePathname(), params = useSearchParams();
  if (!steps.some(step => pathname.startsWith(step.path))) return null;
  const reference = { zoneId: params.get("zoneId"), raftId: params.get("raftId"), cycleId: params.get("cycleId") };
  const visible = steps.filter(step => operationAllowed(step.area, identity, permissions.functionPermissions));
  return <nav className={styles.contextNav} aria-label="Hành trình nuôi trồng"><ol className={styles.journeyList}>{visible.map((step, index) => {
    const title = "title" in step ? step.title : operationModules.find(entry => entry.key === step.area)!.title;
    const current = pathname.startsWith(step.path);
    return <li key={step.kind} className={styles.journeyItem}>
      {index > 0 && <span aria-hidden="true" className={styles.journeyArrow}>→</span>}
      <Link href={farmingReferenceHref(step.kind, step.kind === "nursery" ? { zoneId: reference.zoneId } : reference)} aria-current={current ? "page" : undefined} className={styles.journeyLink}>
        <span aria-hidden="true" className={styles.journeyNumber}>{index + 1}</span>{title}{step.kind === "material" ? " (tùy chọn)" : ""}
      </Link>
    </li>;
  })}</ol></nav>;
}
