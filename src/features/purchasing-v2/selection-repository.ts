import { z } from "zod";
import { createOperationsRepository, type Query } from "@/features/operations/repository";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { selectionQueries } from "@/shared/presentation/filter-selection";
import { vietnameseBusinessDate } from "@/shared/format/date-only";
import * as c from "./contracts";
const repository = createOperationsRepository("purchase-receipts");
type Result = z.infer<typeof c.search>;
export async function readSelectedReceipts(query:Query, selections:Record<string,string>, signal:AbortSignal):Promise<WorkspaceResult<Result>> {
 const queries=selectionQueries(query,selections);
 if(queries.length===1)return repository.read("list",queries[0],c.search,signal);
 const today=vietnameseBusinessDate(), end=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).toISOString().slice(0,10);
 const combined:Result={page:{items:[],page:1,pageSize:Number(query.pageSize??20),total:0},from:query.from??`${today.slice(0,7)}-01`,to:query.to??end,totals:{count:0,completedCount:0,receiptsTotal:0,returnsTotal:0,netTotal:0,raftMaterialCost:null}};
 if(!queries.length)return {status:"success",data:combined};
 const rows=new Map<string,z.infer<typeof c.row>>(), materialStatuses=new Set<string>();
 for(const part of queries){
  let expected:number|undefined;const seen=new Set<string>();
  for(let page=1;page<=100;page++){
   if(signal.aborted)return {status:"error",httpStatus:0,uncertain:false};
   const result=await repository.read("list",{...part,page:String(page),pageSize:"100"},c.search,signal);
   if(result.status!=="success")return result;
   const data=result.data;
   if(expected!==undefined&&expected!==data.page.total)return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
   expected=data.page.total;
   if(data.page.page!==page||data.page.items.some(row=>seen.has(row.id)))return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
   if(page===1){
    combined.from=data.from;combined.to=data.to;
    combined.totals.receiptsTotal+=data.totals.receiptsTotal;combined.totals.returnsTotal+=data.totals.returnsTotal;combined.totals.netTotal+=data.totals.netTotal;
    const status=part.statusId??"all";
    // Raft material cost deliberately ignores itemGroup in the backend. Count it once per disjoint status.
    if(data.totals.raftMaterialCost!==null&&!materialStatuses.has(status)){combined.totals.raftMaterialCost=(combined.totals.raftMaterialCost??0)+data.totals.raftMaterialCost;materialStatuses.add(status);}
   }
   for(const row of data.page.items){
    seen.add(row.id);const previous=rows.get(row.id);
    if(previous&&(previous.code!==row.code||previous.total!==row.total||previous.statusId!==row.statusId))return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
    rows.set(row.id,previous?{...row,linesTotal:previous.linesTotal+row.linesTotal}:row);
   }
   if(seen.size>=data.page.total)break;
   if(!data.page.items.length||page===100)return {status:"error",httpStatus:503,uncertain:false};
  }
 }
 const sorted=[...rows.values()].sort((a,b)=>b.receiptDate.localeCompare(a.receiptDate)||b.code.localeCompare(a.code));
 combined.page.total=sorted.length;combined.totals.count=sorted.length;combined.totals.completedCount=sorted.filter(row=>row.statusId===1702).length;
 combined.page.page=Math.min(Number(query.page??1),Math.max(1,Math.ceil(sorted.length/combined.page.pageSize)));
 combined.page.items=sorted.slice((combined.page.page-1)*combined.page.pageSize,combined.page.page*combined.page.pageSize);
 return {status:"success",data:combined};
}
export function downloadSelectedReceipts(query:Query,selections:Record<string,string>) { return repository.downloadMany(selectionQueries(query,selections)); }
