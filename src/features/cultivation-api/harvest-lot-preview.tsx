"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceGallery } from "@/components/ui/evidence-gallery";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { harvestDetail } from "./records-contracts";
import { HarvestLotButton } from "./harvest-detail";
import styles from "./cultivation-flow.module.css";
const repository=createOperationsRepository("harvest");
export function HarvestLotPreview({id,zoneId,onSaved,onClose}:{id:string;zoneId:string;onSaved():void;onClose():void}) {
 const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>repository.read("detail",{id,zoneId},harvestDetail,signal),[id,zoneId])),record=remote.data;
 return <section className={styles.recordDetail} aria-label="Chi tiết lô thu hoạch"><ErrorNotice error={remote.error}/>{remote.loading?<Skeleton/>:record&&<><h4>{record.lotCode} · {record.raftCode}</h4><dl><div><dt>Thời điểm thu hoạch</dt><dd>{displayTime(record.harvestedAt)}</dd></div><div><dt>Người ghi nhận</dt><dd>{record.recordedByName??"—"}</dd></div><div><dt>Vùng / bè nuôi</dt><dd>{record.zoneCode} · {record.raftCode}</dd></div><div><dt>Làn thu hoạch / đã thu hết</dt><dd>{record.laneNumbers.join(", ")} / {record.finishedLaneNumbers.join(", ")||"Chưa có"}</dd></div><div><dt>Số lồng / quy đổi</dt><dd>{record.cageCount.toLocaleString("vi-VN")} lồng · {record.kgPerCage.toLocaleString("vi-VN")} kg/lồng</dd></div>{([["Ước tính",record.estimatedKg],["Đã lập hóa đơn",record.figures.invoicedKg],["Đã bán",record.figures.soldKg],["Đã trả lại",record.figures.returnedKg],["Còn lại",record.figures.remainingKg],["Hao hụt",record.figures.lostKg],["Chênh lệch",record.figures.differenceKg]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value.toLocaleString("vi-VN")} kg</dd></div>)}</dl>{record.figures.notFinal&&<p>Số liệu chưa chốt vì lô còn đang bán.</p>}{record.photos.length>0&&<div className="mt-5"><EvidenceGallery title="Ảnh chuyến thu hoạch" images={record.photos.map((photo,index)=>({id:photo.key,url:photo.url,label:`Ảnh thu hoạch ${index+1} · ${record.lotCode}`}))}/></div>}<footer><HarvestLotButton id={id} zoneId={zoneId} label="Mở hồ sơ lô / xử lý" onSaved={onSaved}/><Button className="w-auto" variant="secondary" onClick={onClose}>Thu gọn</Button></footer></>}{remote.error&&<Button variant="secondary" onClick={remote.reload}>Tải lại hồ sơ lô</Button>}</section>;
}
