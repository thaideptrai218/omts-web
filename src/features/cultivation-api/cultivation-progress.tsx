"use client";
import { useMemo,useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice,Field,Skeleton,businessToday,useRemote } from "@/features/operations/ui";
import { raftProgress } from "./records-contracts";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { LaneBoard } from "./lane-board";
import { LaneDetail } from "./progress";
import styles from "./cultivation-flow.module.css";
const repo=createOperationsRepository("cultivation-cycles");
export function CultivationProgress({raftId,zoneId}:{raftId:string;zoneId:string}){
 const [date,setDate]=useState(businessToday()),[lane,setLane]=useState<number>();
 const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>repo.read("progress",{id:raftId,zoneId,...(date?{date}:{})},raftProgress,signal),[raftId,zoneId,date]));
 return <section className={styles.progressPanel}><div className={styles.progressHeading}><div><h3>Tiến độ các làn</h3><p>{remote.data?.cycle?`Chu kỳ từ ${formatVietnameseDate(remote.data.cycle.startDate)}`:"Trạng thái theo ngày đang xem"}</p></div><div className={styles.dateControl}><Field label="Ngày xem tiến độ" type="date" max={businessToday()} value={date} onChange={e=>{setDate(e.target.value);setLane(undefined);}}/></div></div><ErrorNotice error={remote.error}/>{remote.loading?<Skeleton/>:<><LaneBoard lanes={remote.data?.lanes??[]} selected={lane} onSelect={setLane}/>{!remote.data?.cycle&&<p className={styles.empty}>Không có chu kỳ tại ngày đã chọn.</p>}{lane&&<div className={styles.laneDetail}><LaneDetail key={`${raftId}:${remote.data?.cycle?.id}:${lane}`} raftId={raftId} zoneId={zoneId} lane={lane} cycleId={remote.data?.cycle?.id} onClose={()=>setLane(undefined)}/></div>}</>}{remote.error&&<button className="mt-3 text-sm text-primary underline" type="button" onClick={remote.reload}>Tải lại tiến độ</button>}</section>;
}
