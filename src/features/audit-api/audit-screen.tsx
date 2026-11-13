"use client";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { useEffect, useRef, useState } from "react";
import { AuditChangeSummary } from "./change-summary";
import { auditAction, auditTime, recordNames } from "./presentation";
import { Button } from "@/components/ui/button";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { DataTable, ErrorNotice, Field, FilterPanel, Paging, Skeleton } from "@/features/operations/ui";
import { auditDetail, auditPage, type AuditDetail, type AuditPage } from "./contracts";
export function AuditScreen() { const [filters,setFilters]=useState({action:"",recordType:"",recordCode:""}),[time,setTime]=useState<TimeRangeValue>(allTime),[page,setPage]=useState(1),[data,setData]=useState<AuditPage>(),[detail,setDetail]=useState<AuditDetail>(),[loading,setLoading]=useState(false),[error,setError]=useState<string>();
  async function load(next=page){setLoading(true);setError(undefined);try{const q=new URLSearchParams({...filters,from:time.from,to:time.to,page:String(next),pageSize:"20"});const r=await bffFetch(`/api/audit-events?${q}`,{cache:"no-store"});const v=await r.json();const p=auditPage.safeParse(v.data);if(!r.ok||v.status!=="success"||!p.success)throw new Error("Không tải được nhật ký thao tác.");setData(p.data);setPage(next)}catch(e){setError(e instanceof Error?e.message:"Không tải được nhật ký thao tác.")}finally{setLoading(false)}}
  const [detailOpen,setDetailOpen]=useState(false), [opening,setOpening]=useState(false);
  const controller = useRef<AbortController | undefined>(undefined), listScroll = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  async function open(id:string){
    controller.current?.abort(); const request = new AbortController(); controller.current=request;
    listScroll.current=window.scrollY;window.scrollTo(0,0);
    setDetailOpen(true);setOpening(true);setDetail(undefined);setError(undefined);
    try{const r=await bffFetch(`/api/audit-events?id=${id}`,{cache:"no-store",signal:request.signal});const v=await r.json();const p=auditDetail.safeParse(v.data);if(!r.ok||v.status!=="success"||!p.success)throw new Error();if(!request.signal.aborted)setDetail(p.data)}catch{if(!request.signal.aborted)setError("Chưa tải được chi tiết nhật ký. Vui lòng thử lại.");}finally{if(!request.signal.aborted)setOpening(false);}
  }
  if(detailOpen)return <section><Button className="mb-5 w-auto" variant="secondary" onClick={()=>{controller.current?.abort();setDetailOpen(false);setError(undefined);requestAnimationFrame(()=>window.scrollTo(0,listScroll.current));}}>← Quay lại nhật ký</Button><h1 className="text-2xl font-semibold">Chi tiết thay đổi</h1><ErrorNotice error={error}/>{opening?<Skeleton/>:detail&&<AuditChangeSummary record={detail}/>}</section>;
  return <section><div className="mb-5 flex items-end justify-between"><div><h1 className="text-2xl font-semibold">Nhật ký thao tác</h1><p className="mt-1 text-sm text-text-muted">Theo dõi ai đã thao tác, lúc nào và bản ghi nào bị thay đổi.</p></div><Button className="w-auto" onClick={()=>void load(1)}>Tra cứu</Button></div><FilterPanel columns="three"><TimeRangeFilter legend="Thời gian thao tác" value={time} onChange={setTime}/><Field label="Loại bản ghi" value={filters.recordType} onChange={e=>setFilters({...filters,recordType:e.target.value})}/><Field label="Hành động" value={filters.action} onChange={e=>setFilters({...filters,action:e.target.value})}/><Field label="Mã bản ghi" value={filters.recordCode} onChange={e=>setFilters({...filters,recordCode:e.target.value})}/></FilterPanel><ErrorNotice error={error}/>{loading?<Skeleton/>:data&&<><DataTable headings={["Thời gian","Người thao tác","Hành động","Bản ghi","Lý do","Chi tiết"]} empty={!data.page.items.length}>{data.page.items.map(row=><tr key={row.id}><td>{auditTime(row.occurredAt)}</td><td>{row.actor.kind === "System" ? "Hệ thống" : row.actor.name}</td><td>{auditAction(row.action)}</td><td>{recordNames[row.recordType] ?? "Hồ sơ nghiệp vụ"}{row.recordCode?` · ${row.recordCode}`:""}</td><td>{row.reason||"—"}</td><td><button className="font-semibold text-primary underline" onClick={()=>void open(row.id)}>Xem</button></td></tr>)}</DataTable><Paging page={data.page.page} total={data.page.total} onChange={p=>void load(p)}/></>}</section> }
