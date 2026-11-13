"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { operationAllowed, operationModules } from "@/features/operations/permissions";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import styles from "@/components/layout/top-shell.module.css";
import { farmingReferenceHref } from "./farming-reference-href";

/** The overview screen (route /farming/cycles): not a step of the flow, so it stands in front of it, numbered 0. Nursery shares its permission. */
const overview = { area: "cultivation-cycles", title: "Hành trình", caption: "Tổng hợp tiến độ và báo cáo đợt nuôi", path: "/farming/cycles" } as const;
/** The farming flow in order. Nursery shares the cultivation-cycle permission and has its own route. */
const steps = [
  { area: "cultivation-cycles", kind: "nursery", title: "Ươm giống", caption: "Ươm giống con trong vùng", path: "/farming/nursery" },
  { area: "seeding", kind: "seeding", caption: "Đưa giống xuống từng làn", path: "/operations/seeding" },
  { area: "harvest", kind: "harvest", caption: "Thu theo đơn mua", path: "/operations/harvest" },
  { area: "material-usages", kind: "material", caption: "Cho ăn, thuốc, sửa chữa", path: "/operations/material-usages" },
  { area: "water", kind: "water", caption: "Đo độ mặn, nhiệt độ", path: "/operations/water" },
] as const;

/** The one bar of the farming screens: the Hành trình overview (0), a divider, then the numbered flow. The current raft is carried through every link; record IDs belong only to the source screen. */
export function FarmingWorkflowNav({ identity, permissions }: { identity: BrowserIdentityDto; permissions: PermissionProjection }) {
  const pathname = usePathname(), params = useSearchParams();
  if (pathname !== overview.path && !pathname.startsWith(`${overview.path}/`) && !steps.some(step => pathname.startsWith(step.path))) return null;
  const reference = { zoneId: params.get("zoneId"), raftId: params.get("raftId"), cycleId: params.get("cycleId") };
  const allowed = (area: (typeof steps)[number]["area"]) => operationAllowed(area, identity, permissions.functionPermissions);
  const visible = steps.filter(step => allowed(step.area));
  const onOverview = pathname.startsWith(overview.path);
  return <nav className={styles.contextNav} aria-label="Hành trình nuôi trồng">
    {allowed(overview.area) && <Link href={farmingReferenceHref("cycle", reference.raftId ? { ...reference, tab: "journey" } : reference)} aria-current={onOverview ? "page" : undefined} className={`${styles.journeyLink} ${styles.journeyOverview}`}>
      <span aria-hidden="true" className={styles.journeyNumber}>0</span>
      <span className={styles.journeyText}><span>{overview.title}</span><span className={styles.journeyCaption}>{overview.caption}</span></span>
    </Link>}
    {allowed(overview.area) && visible.length > 0 && <span aria-hidden="true" className={styles.journeyDivider} />}
    <ol aria-label="Các bước nuôi trồng" className={styles.journeyList}>{visible.map((step, index) => {
      const title = "title" in step ? step.title : operationModules.find(entry => entry.key === step.area)!.title;
      const href = farmingReferenceHref(step.kind, step.kind === "nursery" ? { zoneId: reference.zoneId, raftId: reference.raftId, cycleId: reference.cycleId } : reference);
      return <li key={step.kind} className={styles.journeyItem}>
        {index > 0 && <span aria-hidden="true" className={styles.journeyArrow}>→</span>}
        <Link href={href} aria-current={pathname.startsWith(step.path) ? "page" : undefined} className={styles.journeyLink}>
          <span aria-hidden="true" className={styles.journeyNumber}>{index + 1}</span>
          <span className={styles.journeyText}><span>{title}{step.kind === "material" ? " (tùy chọn)" : ""}</span><span className={styles.journeyCaption}>{step.caption}</span></span>
        </Link>
      </li>;
    })}</ol>
  </nav>;
}
