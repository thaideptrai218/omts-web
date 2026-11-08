import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { selectionQueries } from "@/shared/presentation/filter-selection";
export type SelectionPage<T> = {items:T[];page:number;pageSize:number;total:number};
type Query = Record<string,string|undefined>;
/** Only multi-select queries collect complete pages. Never filter just the visible page. */
export async function readSelectionPages<T extends {id:string}>(read:(query:Query,signal:AbortSignal)=>Promise<WorkspaceResult<SelectionPage<T>>>,base:Query,selections:Record<string,string>,signal:AbortSignal, compare?:(a:T,b:T)=>number):Promise<WorkspaceResult<SelectionPage<T>>> {
 const queries=selectionQueries(base,selections), page=Number(base.page??1), pageSize=Number(base.pageSize??20);
 if(!queries.length)return {status:"success",data:{items:[],page:1,pageSize,total:0}};
 if(queries.length===1)return read(queries[0],signal);
 const records=new Map<string,T>();
 for(const query of queries){
  let expected:number|undefined;const seen=new Set<string>();
  for(let index=1;index<=100;index++){
   if(signal.aborted)return {status:"error",httpStatus:0,uncertain:false};
   const result=await read({...query,page:String(index),pageSize:"100"},signal);
   if(result.status!=="success")return result;
   const current=result.data;
   if(expected!==undefined&&expected!==current.total)return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
   expected=current.total;
   if(current.page!==index||current.items.some(row=>seen.has(row.id)))return {status:"error",httpStatus:409,code:"MSG06",uncertain:false};
   for(const row of current.items){seen.add(row.id);records.set(row.id,row);}
   if(seen.size>=current.total)break;
   if(!current.items.length||index===100)return {status:"error",httpStatus:503,uncertain:false};
  }
 }
 const items=[...records.values()].sort(compare??((a,b)=>{const label=(r:T)=>{const v=r as Record<string,unknown>;return String(v.name??v.fullName??v.username??v.code??v.id);};return label(a).localeCompare(label(b),"vi")||a.id.localeCompare(b.id);}));
 const currentPage=Math.min(page,Math.max(1,Math.ceil(items.length/pageSize)));
 return {status:"success",data:{items:items.slice((currentPage-1)*pageSize,currentPage*pageSize),page:currentPage,pageSize,total:items.length}};
}
