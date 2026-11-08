import { expect,it,vi } from "vitest";
const {read}=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("@/features/operations/repository",()=>({createOperationsRepository:()=>({read})}));
import {readSelectedReceipts} from "./selection-repository";
it("deduplicates receipts but sums disjoint matching lines and avoids repeating raft cost",async()=>{
 read.mockImplementation(async(_action,query)=>{const seed=query.itemGroup==="Seed",value=seed?100:200;return {status:"success",data:{page:{items:[{id:"same",code:"PN01",receiptDate:"2026-11-08",statusId:1702,total:300,linesTotal:value}],page:Number(query.page),pageSize:100,total:1},from:"2026-11-01",to:"2026-11-30",totals:{count:1,completedCount:1,receiptsTotal:value,returnsTotal:value/10,netTotal:value*.9,raftMaterialCost:180}}};});
 const result=await readSelectedReceipts({page:"1",pageSize:"20",raftId:"raft"},{itemGroup:"Seed|Material",statusId:""},new AbortController().signal);
 expect(result).toMatchObject({status:"success",data:{page:{total:1,items:[{id:"same",linesTotal:300,total:300}]},totals:{count:1,completedCount:1,receiptsTotal:300,returnsTotal:30,netTotal:270,raftMaterialCost:180}}});
 expect(read.mock.calls).toHaveLength(2);expect(read.mock.calls.every(([,query])=>query.raftId==="raft")).toBe(true);
});
