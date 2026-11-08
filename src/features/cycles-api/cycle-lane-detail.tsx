"use client";
import { useMemo, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { laneProgress } from "@/features/cultivation-api/records-contracts";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import styles from "./cycles-screen.module.css";
const repo = createOperationsRepository("cultivation-cycles");
export function CycleLaneDetail({raftId,zoneId,lane,cycleId,onClose}:{raftId:string;zoneId:string;lane:number;cycleId?:string;onClose():void}) {
  const [selectedId,setSelectedId]=useState<string>();
  const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>cycleId ? repo.read("lane-progress",{id:raftId,zoneId,laneNumber:String(lane),cycleId},laneProgress,signal):Promise.resolve({status:"success" as const,data:null}),[raftId,zoneId,lane,cycleId]));
  const selected=remote.data?.sessions.find(session=>session.id===selectedId);
  return <section className={styles.sessionSection} aria-label={`Các lần thả giống làn ${lane}`}><div className={styles.sectionHeading}><h3>Thả giống · Làn {lane}</h3><button type="button" className={styles.textAction} onClick={onClose}>Thu gọn</button></div><ErrorNotice error={remote.error}/>
    {remote.loading ? <Skeleton/> : !cycleId ? <p className={styles.detailHint}>Không có chu kỳ tại ngày đã chọn.</p> : !remote.data?.sessions.length ? <p className={styles.detailHint}>Chưa có lần thả giống nào trong chu kỳ này.</p> : <><div className={styles.sessionCards}>{remote.data.sessions.map(session=><button type="button" key={session.id} className={styles.sessionCard} aria-pressed={selectedId===session.id} aria-controls="cycle-seeding-session-detail" onClick={()=>setSelectedId(session.id)}><span className={styles.sessionDate}>{formatVietnameseDate(session.seedingDate)}<span>{selectedId===session.id ? "Đang chọn" : "Xem chi tiết"}</span></span><strong>{session.seedLot.code}</strong><span>{session.seedLot.supplierName}</span><span className={styles.sessionQuantity}>{session.quantity.toLocaleString("vi-VN")} {session.seedLot.unit}</span></button>)}</div>
      <div id="cycle-seeding-session-detail" className={styles.sessionDetail} aria-live="polite">{selected ? <><h4>Chi tiết lần thả ngày {formatVietnameseDate(selected.seedingDate)}</h4><dl>{[["Lô giống",selected.seedLot.code],["Phiếu nhập",selected.seedLot.receiptCode],["Mặt hàng",selected.seedLot.itemName ?? "Chưa có thông tin"],["Nhà cung cấp",selected.seedLot.supplierName],["Số lượng cả lần thả",`${selected.quantity.toLocaleString("vi-VN")} ${selected.seedLot.unit}`]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></> : <p>Chọn một lần thả giống để xem thông tin lô và phiếu nhập.</p>}</div>
      <p className={styles.sessionNote}>Số lượng thuộc cả lần thả giống, không chia đều cho từng làn.</p></>}
    {remote.error && <button className={styles.textAction} type="button" onClick={remote.reload}>Tải lại lần thả giống</button>}
  </section>;
}
