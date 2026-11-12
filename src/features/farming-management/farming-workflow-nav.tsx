"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { operationAllowed, operationModules } from "@/features/operations/permissions";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import type { BrowserIdentityDto } from "@/server/backend/browser-dto";
import styles from "@/components/layout/top-shell.module.css";
import { useCycleJourneyStrip } from "@/features/cycles-api/use-cycle-journey-strip";
import { farmingReferenceHref } from "./farming-reference-href";
import { JourneyStepCard } from "./farming-journey-step-card";

/** The farming journey in order. Nursery shares the cultivation-cycle permission and has its own route. */
const steps = [
  { area: "cultivation-cycles", kind: "nursery", title: "Ươm giống", caption: "Ươm giống con trong vùng", path: "/farming/nursery" },
  { area: "cultivation-cycles", kind: "cycle", title: "Chu kỳ nuôi", caption: "Một đợt nuôi trên một bè", path: "/farming/cycles" },
  { area: "seeding", kind: "seeding", caption: "Đưa giống xuống từng làn", path: "/operations/seeding" },
  { area: "harvest", kind: "harvest", caption: "Thu theo đơn mua", path: "/operations/harvest" },
  { area: "material-usages", kind: "material", caption: "Cho ăn, thuốc, sửa chữa", path: "/operations/material-usages" },
  { area: "water", kind: "water", caption: "Đo độ mặn, nhiệt độ", path: "/operations/water" },
] as const;

/**
 * Carry the current raft through the tabs; record IDs belong only to the source screen.
 * With a cycle in context (cycleId in the link, or the raft's open cycle) every step shows its state and progress; otherwise plain numbered steps.
 */
export function FarmingWorkflowNav({ identity, permissions }: { identity: BrowserIdentityDto; permissions: PermissionProjection }) {
  const pathname = usePathname(), params = useSearchParams();
  const onJourney = steps.some(step => pathname.startsWith(step.path));
  const reference = { zoneId: params.get("zoneId"), raftId: params.get("raftId"), cycleId: params.get("cycleId") };
  const strip = useCycleJourneyStrip({ raftId: reference.raftId, cycleId: reference.cycleId, enabled: onJourney && operationAllowed("cultivation-cycles", identity, permissions.functionPermissions) });
  if (!onJourney) return null;
  const visible = steps.filter(step => operationAllowed(step.area, identity, permissions.functionPermissions));
  const cards = strip.state !== "plain";
  return <nav className={styles.contextNav} aria-label="Hành trình nuôi trồng"><ol className={cards ? styles.stepCards : styles.journeyList}>{visible.map((step, index) => {
    const title = "title" in step ? step.title : operationModules.find(entry => entry.key === step.area)!.title;
    const current = pathname.startsWith(step.path);
    const href = farmingReferenceHref(step.kind, step.kind === "nursery" ? { zoneId: reference.zoneId } : reference);
    if (cards) return <JourneyStepCard key={step.kind} href={href} index={index + 1} title={title} caption={step.caption} current={current} loading={strip.state === "loading" && step.kind !== "water"} item={strip.state === "ready" ? strip.items[step.kind] : undefined} />;
    return <li key={step.kind} className={styles.journeyItem}>
      {index > 0 && <span aria-hidden="true" className={styles.journeyArrow}>→</span>}
      <Link href={href} title={step.caption} aria-current={current ? "page" : undefined} className={styles.journeyLink}>
        <span aria-hidden="true" className={styles.journeyNumber}>{index + 1}</span>{title}{step.kind === "material" ? " (tùy chọn)" : ""}
      </Link>
    </li>;
  })}</ol></nav>;
}
