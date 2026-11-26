"use client";
import type { z } from "zod";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import { RecordCrewDetail } from "@/features/cultivation-api/record-crew-detail";
import { CagesWithWeighedKg } from "@/features/cultivation-api/harvest-quantity-cell";
import type { harvestDetail } from "@/features/cultivation-api/records-contracts";
import { PlanRefLink } from "@/features/harvest-plans/plan-ref-link";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import styles from "@/features/purchase-documents/purchases.module.css";

type Lot = z.infer<typeof harvestDetail>;
const dash = (value: string | null | undefined) => value || "—";

/**
 * Tab "Thu hoạch": how the trip was made: the time and cages, the plan, the photos and the crew (a lot made before plans also lists its lanes).
 * The pieces are the ones of the raft harvest screen (gallery, crew); only the layout is the one of the other tabs.
 */
export function LotHarvestTab({ lot }: { lot: Lot }) {
  const percents = lot.lanePercents ?? {}, finished = new Set(lot.finishedLaneNumbers);
  return <>
    <header className={styles.head}><div><h3>Chuyến thu hoạch {lot.lotCode}</h3></div></header>
    <div className={styles.headFacts}>
      <div><span>Thời gian thu:</span><strong>{viDateTime(lot.harvestedAt)}</strong></div>
      <div><span>Số lồng:</span><span><CagesWithWeighedKg cages={lot.cageCount} weighedKg={lot.weighedKg} /></span></div>
      <div><span>Người ghi:</span><strong>{dash(lot.recordedByName)}</strong></div>
      <div><span>KHT:</span>{lot.harvestPlan ? <PlanRefLink className={styles.link} code={lot.harvestPlan.code} /> : <strong>—</strong>}</div>
      {lot.overPlanReason && <div><span>Thu vượt KH:</span><span>{lot.overPlanReason}</span></div>}
    </div>
    {!lot.harvestPlan && <div className={styles.innerScroll}><table className={styles.inner} aria-label="Làn thu hoạch"><thead><tr><th>Làn</th><th>Tình trạng</th><th className={styles.num}>Tỷ lệ thu</th></tr></thead>
      <tbody>{lot.laneNumbers.map((lane) => <tr key={lane}><td>Làn {lane}</td><td>{finished.has(lane) ? "Đã thu hết" : "Đang thu"}</td><td className={styles.num}>{percents[String(lane)] == null ? "—" : `${percents[String(lane)].toLocaleString("vi-VN")}%`}</td></tr>)}
        {!lot.laneNumbers.length && <tr><td colSpan={3} className={styles.empty}>Chuyến thu hoạch không ghi làn nào.</td></tr>}</tbody></table></div>}
    {lot.photos.length > 0 && <div className="mt-4"><EvidenceGallery title="Ảnh chuyến thu hoạch" images={lot.photos.map((photo, index) => ({ id: photo.key, url: photo.url, label: `Ảnh thu hoạch ${index + 1} · ${lot.lotCode}` }))} /></div>}
    <RecordCrewDetail label="Nhân viên cùng thu" crew={lot.crew} />
  </>;
}
