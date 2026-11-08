"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { readZoneMap } from "./zone-map-repository";
import type { MapSelection } from "./vietmap-view";
import type { MapZone } from "./zone-map-contract";
const VietMapView=dynamic(()=>import("./vietmap-view"),{ssr:false,loading:()=><Skeleton/>});
export function GlobalZoneMap(){
 const [include,setInclude]=useState(false),[selection,setSelection]=useState<MapSelection>();
 const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>readZoneMap(include,signal),[include]));
 const zone=remote.data?.find(row=>row.id===selection?.zoneId);
 return <section className="mb-6 rounded-card border border-border bg-surface p-4 sm:p-5" aria-label="Bản đồ tổng thể vùng nuôi"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-semibold">Bản đồ tổng thể vùng và bè nuôi</h2><p className="mt-1 text-sm text-text-muted">Chọn vùng hoặc bè trên bản đồ để xem thông tin ngay bên dưới.</p></div><div className="flex flex-wrap items-center gap-4"><label className="text-sm"><input type="checkbox" checked={include} onChange={e=>{setInclude(e.target.checked);setSelection(undefined);}}/> Bao gồm vùng ngừng dùng</label><Button variant="secondary" className="w-auto" disabled={remote.loading} onClick={remote.reload}>Tải lại bản đồ</Button></div></div><ErrorNotice error={remote.error}/>{remote.loading?<Skeleton/>:remote.data&&<VietMapView zones={remote.data} onSelect={setSelection}/>}
 {remote.data && <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn vùng xem thông tin">{remote.data.map(row=><button className="rounded-control border border-border px-3 py-2 text-sm aria-pressed:border-primary aria-pressed:bg-primary-soft" type="button" key={row.id} aria-pressed={selection?.kind==="zones"&&selection.id===row.id} onClick={()=>setSelection({kind:"zones",id:row.id,zoneId:row.id,label:row.name})}>{row.code} · {row.name}</button>)}</div>}
 {selection&&zone&&<MapRecordDetail key={`${selection.kind}:${selection.id}`} selection={selection} zone={zone} onSelect={setSelection} onClose={()=>setSelection(undefined)}/>}
 </section>;
}
function MapRecordDetail({selection,zone,onSelect,onClose}:{selection:MapSelection;zone:MapZone;onSelect(value:MapSelection):void;onClose():void}){
 const remote=useRemote(useMemo(()=>(signal:AbortSignal)=>createWorkspaceRepository(selection.kind).detail(selection.id,signal),[selection.kind,selection.id]));
 const fields=selection.kind==="zones"?[["code","Mã vùng"],["name","Tên vùng"],["location","Vị trí"],["area","Diện tích (ha)"],["waterMeasurementPoint","Điểm đo nước"],["latitude","Vĩ độ"],["longitude","Kinh độ"]]:[["code","Mã bè"],["laneCount","Số làn"],["latitude","Vĩ độ"],["longitude","Kinh độ"]];
 return <section aria-label="Thông tin vị trí đang chọn" className="mt-5 border-t border-border pt-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs text-text-muted">{selection.kind==="zones"?"HỒ SƠ VÙNG NUÔI":zone.name}</p><h3 className="mt-1 text-lg font-semibold">{selection.label}</h3></div><Button variant="secondary" className="w-auto" onClick={onClose}>Thu gọn</Button></div><ErrorNotice error={remote.error}/>{remote.loading?<Skeleton/>:remote.data&&<dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key,label])=><div key={key}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 text-sm font-medium">{remote.data?.[key]==null?"Chưa có thông tin":String(remote.data[key])}</dd></div>)}</dl>}{remote.error&&<Button variant="secondary" className="mt-3 w-auto" onClick={remote.reload}>Tải lại thông tin</Button>}
 {selection.kind==="zones"&&<div className="mt-5"><h4 className="mb-3 text-sm font-semibold">Bè có trong dữ liệu bản đồ · {zone.rafts.length}</h4><div className="flex flex-wrap gap-2">{zone.rafts.map(raft=><button key={raft.id} type="button" className="rounded-control border border-border px-3 py-2 text-sm hover:border-primary" onClick={()=>onSelect({kind:"rafts",id:raft.id,zoneId:zone.id,label:`Bè ${raft.code}`})}>{raft.code}</button>)}{!zone.rafts.length&&<p className="text-sm text-text-muted">Chưa có bè đang dùng.</p>}</div></div>}</section>;
}
