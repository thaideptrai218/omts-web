// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
vi.mock("next/navigation",()=>({useSearchParams:()=>new URLSearchParams()}));
vi.mock("@/features/api-workspace/api-workspace-shell",()=>({useApiWorkspace:()=>({identity:{subjectType:"CooperativeOwner"},permissions:{functionPermissions:[]}})}));
vi.mock("@/features/operations/lookups",()=>({loadOptions:async()=>({status:"success",data:[{id:"00000000-0000-4000-8000-000000000001",code:"Z1",name:"Vùng QA",location:null,area:null,statusId:101,status:"In Use",inUseRaftCount:1,licenseState:null}]})}));
const {write}=vi.hoisted(()=>({write:vi.fn()}));
vi.mock("@/features/operations/repository",()=>({createOperationsRepository:(area:string)=>({write,read:async()=>({status:"success",data:area==="cultivation-cycles"?[{raftId:"raft",raftCode:"B1",raftStatusId:101,raftStatus:"In Use",laneCount:3,cycle:{id:"cycle",startDate:"2026-09-01",closeDate:null},lastCloseDate:null,canStart:false,canEdit:false,canCancel:false}]:{canRecord:false,groups:[{cycle:{id:"cycle",startDate:"2026-09-01"},locked:true,repairs:[{records:[{id:"material",raftId:"raft",raftCode:"B1",usageDate:"2026-10-07",itemCode:"VT005",itemName:"Phao HDPE",quantity:2,unit:"cái",repairReason:"Dây neo bị đứt",recordedByName:"Nhân viên QA",recordedAt:"2026-10-07T07:00:00+07:00",canEdit:false}]}]}]}})})}));
import {CultivationRecordsScreen} from "./records-screen";
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("opens a raft row, then a material record inline from a data cell without an editor or a write",async()=>{
 render(<CultivationRecordsScreen area="material-usages"/>);
 fireEvent.click(await screen.findByRole("button",{name:"Xem bè B1"}));
 fireEvent.click(await screen.findByText("Dây neo bị đứt"));
 expect(screen.getByRole("region",{name:"Chi tiết sử dụng vật tư"})).toBeTruthy();
 expect(screen.queryByRole("dialog")).toBeNull();expect(screen.queryByRole("columnheader",{name:"Thao tác"})).toBeNull();
 expect(screen.queryByRole("button",{name:"Chỉnh sửa ghi nhận"})).toBeNull();expect(write).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Thu gọn"}));expect(screen.queryByRole("region",{name:"Chi tiết sử dụng vật tư"})).toBeNull();
});
