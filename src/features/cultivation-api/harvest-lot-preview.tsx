"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { cycleJourneyLink, yieldLink } from "@/features/farming-management/entity-links";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { RecordHistory } from "@/features/history/record-history";
import { harvestDetail } from "./records-contracts";
import { HarvestCrewDetail } from "./harvest-crew-detail";
import { HarvestLotDetail } from "./harvest-detail";
import { CagesWithEstimatedKg, KgWithApproxCages } from "./harvest-quantity-cell";
import { useAllowed } from "./records-shared";
import styles from "./cultivation-flow.module.css";
const repository=createOperationsRepository("harvest");
export function HarvestLotPreview({id,zoneId,onSaved,onClose}:{id:string;zoneId:string;onSaved():void;onClose():void}) {
 const [editing, setEditing] = useState(false);
 const allowed = useAllowed("harvest", zoneId);
 const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>repository.read("detail",{id,zoneId},harvestDetail,signal),[id,zoneId])),record=remote.data;
 if (editing) return <HarvestLotDetail id={id} zoneId={zoneId} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onSaved(); }} />;
 return <section className={styles.recordDetail} aria-label="Chi tiết lô thu hoạch"><ErrorNotice error={remote.error}/>{remote.loading?<Skeleton/>:record&&<><h4>{record.lotCode} · {record.raftCode}</h4><dl><div><dt>Thời điểm thu hoạch</dt><dd>{displayTime(record.harvestedAt)}</dd></div><div><dt>Người ghi nhận</dt><dd>{record.recordedByName??"—"}</dd></div><div><dt>Vùng / bè nuôi</dt><dd><Link href={farmingReferenceHref("zone", { recordId: record.zoneId, search: record.zoneCode })}>{record.zoneCode}</Link> · <Link href={farmingReferenceHref("raft", { zoneId: record.zoneId, recordId: record.raftId, search: record.raftCode })}>{record.raftCode}</Link></dd></div><div><dt>Làn thu hoạch / đã thu hết</dt><dd>{record.laneNumbers.join(", ")} / {record.finishedLaneNumbers.join(", ")||"Chưa có"}</dd></div><div><dt>Số lồng thu hoạch</dt><dd><CagesWithEstimatedKg cages={record.cageCount} kg={record.estimatedKg}/></dd></div><div><dt>Quy đổi tại thời điểm ghi</dt><dd>{record.kgPerCage.toLocaleString("vi-VN")} kg/lồng</dd></div>{record.overPlanReason&&<div><dt>Lý do thu vượt kế hoạch</dt><dd>{record.overPlanReason}</dd></div>}{([["Đã lập hóa đơn",record.figures.invoicedKg],["Đã bán",record.figures.soldKg],["Đã trả lại",record.figures.returnedKg],["Còn để bán",record.figures.remainingKg],["Kg tồn khi đóng lô",record.figures.lostKg]] as const).filter(([label,value])=>label!=="Kg tồn khi đóng lô"||value>0).map(([label,value])=><div key={label}><dt>{label}</dt><dd><KgWithApproxCages kg={value} kgPerCage={record.kgPerCage}/></dd></div>)}</dl>{record.figures.notFinal&&<p>Số liệu chưa chốt vì lô còn đang bán.</p>}{record.photos.length>0&&<div className="mt-5"><EvidenceGallery title="Ảnh chuyến thu hoạch" images={record.photos.map((photo,index)=>({id:photo.key,url:photo.url,label:`Ảnh thu hoạch ${index+1} · ${record.lotCode}`}))}/></div>}{!allowed("Edit") ? <p>Bạn không có quyền sửa lô trong vùng này.</p> : !record.canCorrect && <p>Lô này không đủ điều kiện sửa. Chu kỳ phải đang mở, vùng và bè đang sử dụng, và người sửa phải là người ghi nhận hoặc Chủ HTX.</p>}<HarvestCrewDetail crew={record.crew} /><RecordHistory kind="harvest" id={record.id} zoneId={zoneId}/><footer><Link href={farmingReferenceHref("lot", { recordId: record.id, search: record.lotCode })}>Truy xuất lô</Link><Link href={cycleJourneyLink({ zoneId: record.zoneId, raftId: record.raftId, cycleId: record.cycleId }) ?? "#"}>Hành trình chu kỳ</Link><Link href={yieldLink({ zoneId: record.zoneId, raftId: record.raftId, cycleId: record.cycleId })}>Sản lượng nuôi</Link>{record.canCorrect && allowed("Edit") && <Button key="edit-lot" type="button" className="w-auto" onClick={() => setEditing(true)}>Chỉnh sửa</Button>}<Button type="button" className="w-auto" variant="secondary" onClick={onClose}>Thu gọn</Button></footer></>}{remote.error&&<Button type="button" variant="secondary" onClick={remote.reload}>Tải lại hồ sơ lô</Button>}</section>;
}
