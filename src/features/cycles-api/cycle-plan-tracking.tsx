"use client";
import { useMemo } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { seedingList } from "@/features/cultivation-api/records-contracts";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import styles from "./cycles-screen.module.css";
const repository=createOperationsRepository("seeding");
export function CyclePlanTracking({cycleId,zoneId}:{cycleId:string;zoneId:string}){
 const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>repository.read("list",{id:cycleId,zoneId},seedingList,signal),[cycleId,zoneId]));
 return <section className={styles.planTracking}><h3>Thực hiện thả giống</h3><ErrorNotice error={remote.error}/>{remote.loading?<Skeleton/>:remote.data&&<><strong>{remote.data.seededCount}/{remote.data.laneCount} làn đã thả giống</strong><progress aria-label="Tỷ lệ làn đã thả giống" value={remote.data.seededCount} max={Math.max(1,remote.data.laneCount)}/><p>{remote.data.seedingCompletedOn?`Đã đánh dấu hoàn tất: ${formatVietnameseDate(remote.data.seedingCompletedOn)}`:"Chưa đánh dấu hoàn tất thả giống"}</p><p>{remote.data.records.length} lần ghi nhận trong chu kỳ.</p>{remote.data.lots.map(lot=><p key={lot.seedLotId}>{lot.code}: <strong>{lot.quantity.toLocaleString("vi-VN")} {lot.unit}</strong></p>)}</>}{remote.error&&<button type="button" className={styles.textAction} onClick={remote.reload}>Tải lại tiến độ</button>}</section>;
}
