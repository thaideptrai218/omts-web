import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
export async function readDebt<T>(query: Record<string,string>, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try { const response = await fetch(`/api/supplier-debts?${new URLSearchParams(Object.entries(query).filter(([,v]) => !!v))}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) }); const value = await response.json(), parsed = schema.safeParse(value.data); return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", code: value.code, httpStatus: response.status, uncertain: false }; } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}

export async function downloadDebt(query:Record<string,string>):Promise<WorkspaceResult<true>> {
 try {
  const response=await fetch(`/api/supplier-debts?${new URLSearchParams(Object.entries({...query,action:"export"}).filter(([,value])=>!!value))}`,{credentials:"same-origin",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60_000)});
  if(!response.ok){const value=await response.json();return {status:"error",httpStatus:response.status,code:value.code,uncertain:false};}
  if(!response.headers.get("content-type")?.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))throw new Error("Unexpected file");
  const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");link.href=url;link.download="cong-no-nha-cung-cap.xlsx";link.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);return {status:"success",data:true};
 }catch{return {status:"error",httpStatus:0,uncertain:false};}
}
