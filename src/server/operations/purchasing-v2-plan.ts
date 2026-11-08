import "server-only";
import {z} from "zod";
import * as c from "@/features/purchasing-v2/contracts";
import type {OperationArea} from "@/features/operations/permissions";
import type {OperationPlan} from "./operation-plan";
export function purchasingV2Plan(area:OperationArea,method:string,query:URLSearchParams,input?:unknown):OperationPlan|undefined{
 if(new Set(query.keys()).size!==query.size)return;
 const receipts=area==="purchase-receipts";
 if(method==="GET"){
  const q=z.strictObject({action:z.enum(["list","detail","debts","debt","cancel-preview","rafts","export"]),id:z.guid().optional(),supplierId:z.guid().optional(),raftId:z.guid().optional(),itemGroup:z.enum(["Seed","Material","Other"]).optional(),page:z.string().regex(/^[1-9]\d{0,6}$/).optional(),pageSize:z.enum(["10","20","50","100"]).optional(),from:z.iso.date().optional(),to:z.iso.date().optional(),code:z.string().optional(),statusId:z.string().regex(/^\d{3,4}$/).optional()}).safeParse(Object.fromEntries(query));if(!q.success||q.data.from&&q.data.to&&q.data.from>q.data.to)return;
  const v=q.data,params=new URLSearchParams();for(const key of ["page","pageSize","from","to","code","statusId","supplierId","raftId","itemGroup"])if(query.has(key))params.set(key,query.get(key)!);
  const base={area,action:v.action,method:"GET" as const,permission:"View"};
  if(receipts&&v.action==="export")return {...base,permission:"Export",path:`/api/purchase-receipts/export?${params}`,schema:z.strictObject({}),file:"export"};
  if(v.action==="list")return {...base,path:`/api/${receipts?"purchase-receipts":"supplier-payments"}?${params}`,schema:receipts?c.search:c.paymentPage};
  if(v.action==="detail"&&v.id)return {...base,path:`/api/${receipts?"purchase-receipts":"supplier-payments"}/${v.id}`,schema:receipts?c.receipt:c.payment,expectedId:v.id};
  if(receipts&&v.action==="rafts")return {...base,path:"/api/purchase-receipts/raft-lookup",schema:z.array(z.object({id:z.guid(),code:z.string(),zoneCode:z.string()}))};
  if(receipts&&v.action==="cancel-preview"&&v.id)return {...base,permission:"Delete",path:`/api/purchase-receipts/${v.id}/cancel-preview`,schema:c.cancelPreview};
  if(!receipts&&v.action==="debts")return {...base,path:`/api/supplier-debts?${params}`,schema:c.debts};
  if(!receipts&&v.action==="debt"&&v.supplierId)return {...base,path:`/api/supplier-debts/${v.supplierId}`,schema:c.debt};
  return;
 }
 if(method!=="POST"||query.size)return;
 const m=z.strictObject({action:z.enum(["create","update","complete","cancel","remove","return","cancel-return","correct"]),id:z.guid().optional(),zoneId:z.undefined().optional(),body:z.unknown()}).safeParse(input);if(!m.success)return;
 const {action,id,body}=m.data,reason=z.strictObject({reason:z.string().trim().min(1).max(2000),rowVersion:z.string().min(1)}),empty=z.strictObject({});
 let schema:z.ZodType|undefined,path="",permission="",verb:OperationPlan["method"]="POST",validator:z.ZodType|undefined,noContent=false;
 if(receipts){schema=c.receipt;
  if(action==="create"&&!id){path="/api/purchase-receipts";permission="Create";validator=c.receiptValues;}
  if(action==="update"&&id){path=`/api/purchase-receipts/${id}`;permission="Edit";validator=c.receiptValues.refine(v=>!!v.rowVersion);verb="PUT";}
  if(action==="complete"&&id){path=`/api/purchase-receipts/${id}/complete`;permission="Edit";validator=z.strictObject({rowVersion:z.string().min(1)});}
  if(action==="cancel"&&id){path=`/api/purchase-receipts/${id}/cancel`;permission="Delete";validator=reason;}
  if(action==="remove"&&id){path=`/api/purchase-receipts/${id}`;permission="Delete";validator=empty;verb="DELETE";noContent=true;schema=z.object({done:z.literal(true)});}
  if(action==="return"&&id){path=`/api/purchase-receipts/${id}/returns`;permission="Create";validator=z.strictObject({reason:z.string().trim().min(1),ownerApproved:z.boolean(),lines:z.array(z.strictObject({receiptLineId:z.guid(),quantity:z.number().positive()})).min(1)});}
  if(action==="cancel-return"&&id){path=`/api/purchase-returns/${id}/cancel`;permission="Owner";validator=reason;}
  if(action==="correct"&&id){path=`/api/purchase-receipts/${id}/correct`;permission="Owner";validator=z.strictObject({reason:z.string().trim().min(1),rowVersion:z.string().min(1),lines:z.array(z.strictObject({lineId:z.guid(),quantity:z.number().positive().nullable(),unitPrice:z.number().int().nonnegative().nullable(),supplierLotCode:z.string().nullable()})).min(1)});}
 }else{schema=c.payment;
  if(action==="create"&&!id){path="/api/supplier-payments";permission="Create";validator=c.paymentValues;}
  if(action==="cancel"&&id){path=`/api/supplier-payments/${id}/cancel`;permission="Create";validator=reason;}
 }
 const parsed=validator?.safeParse(body);if(!parsed?.success||!schema)return;
 return {area,action,path,method:verb,permission,schema,...(noContent?{noContent:true}:{body:parsed.data})};
}
