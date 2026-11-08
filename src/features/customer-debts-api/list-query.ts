import {z} from "zod";
import type {WorkspaceResult} from "@/features/api-workspace/workspace-repository";
import {matchesSelection} from "@/shared/presentation/filter-selection";
import {readCustomerDebt} from "./repository";
import {list} from "./contracts";
export async function readCustomerList(query:Record<string,string>,sign:string,signal:AbortSignal):Promise<WorkspaceResult<z.infer<typeof list>>> {
 if(!sign)return readCustomerDebt({action:"list",...query},list,signal);
 const first=await readCustomerDebt({action:"list",...query,page:"1",pageSize:"100"},list,signal);
 if(first.status!=="success")return first;
 const pageSize=Number(query.pageSize??20),result=first.data;
 if(sign==="-")return {status:"success",data:{...result,page:{items:[],page:1,pageSize,total:0}}};
 const records=[...result.page.items],seen=new Set(records.map(row=>row.customer.id));
 if(result.page.page!==1||seen.size!==records.length||records.length>result.page.total)return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
 for(let page=2;seen.size<result.page.total;page++){
  if(signal.aborted)return {status:"error",httpStatus:0,uncertain:false};
  if(page>100)return {status:"error",httpStatus:503,uncertain:false};
  const next=await readCustomerDebt({action:"list",...query,page:String(page),pageSize:"100"},list,signal);
  if(next.status!=="success")return next;
  if(seen.size+next.data.page.items.length>result.page.total||new Set(next.data.page.items.map(row=>row.customer.id)).size!==next.data.page.items.length||next.data.page.total!==result.page.total||next.data.page.page!==page||!next.data.page.items.length||next.data.page.items.some(row=>seen.has(row.customer.id)))return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
  for(const row of next.data.page.items){records.push(row);seen.add(row.customer.id);}
 }
 const rows=records.filter(row=>matchesSelection(sign,row.debt>0?"owed":"refund")),page=Math.min(Number(query.page??1),Math.max(1,Math.ceil(rows.length/pageSize)));
 return {status:"success",data:{...result,page:{items:rows.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:rows.length}}};
}
