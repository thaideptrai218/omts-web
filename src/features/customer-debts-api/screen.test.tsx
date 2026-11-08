// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
const {read,readList}=vi.hoisted(()=>({read:vi.fn(),readList:vi.fn()}));
vi.mock("./repository",()=>({readCustomerDebt:read,downloadCustomerDebt:vi.fn()}));
vi.mock("./list-query",()=>({readCustomerList:readList}));
vi.mock("@/features/api-workspace/api-workspace-shell",()=>({useApiWorkspace:()=>({identity:{subjectType:"CooperativeOwner"},permissions:{functionPermissions:[]}})}));
import {CustomerDebtsScreen} from "./screen";
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("opens the statement under the customer and keeps cancelled recorded amounts out of debt changes",async()=>{
 const id="529ec3ce-af8f-42f7-a08f-4bab36ba7e65",customer={id,name:"Khách kiểm thử",phoneNumber:"0900000001"};
 readList.mockResolvedValue({status:"success",data:{page:{items:[{customer,debt:250,debtAgeDays:2}],page:1,pageSize:20,total:1},receivablesTotal:900,owedBackTotal:300,awaitingConfirmationCount:2}});
 read.mockResolvedValue({status:"success",data:{customer,from:"2026-11-01",to:"2026-11-08",openingDebt:250,closingDebt:250,debtToday:250,entries:[{id,code:"HD-HUY",date:"2026-11-01",kind:"Invoice",amount:999999,debtChange:0,debtAfter:250,method:null,invoiceCode:null,cancelled:true,awaitingConfirmation:false}],unpaidInvoices:[]}});
 render(<CustomerDebtsScreen/>);fireEvent.click(await screen.findByText("0900000001"));
 const detail=await screen.findByRole("region",{name:"Công nợ Khách kiểm thử"});
 expect(within(detail).getByText("Đã hủy")).toBeTruthy();expect(within(detail).queryByText(/999.999/)).toBeNull();expect(screen.queryByRole("dialog")).toBeNull();expect(within(detail).getByText("Công nợ cuối kỳ")).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Hóa đơn chưa trả"}));expect(within(detail).getByText("Không có dữ liệu phù hợp.")).toBeTruthy();
});
