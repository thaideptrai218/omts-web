// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
const {read}=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("./repository",()=>({readDebt:read,downloadDebt:vi.fn()}));
vi.mock("@/features/api-workspace/api-workspace-shell",()=>({useApiWorkspace:()=>({identity:{subjectType:"CooperativeOwner"},permissions:{functionPermissions:[]}})}));
vi.mock("@/features/purchasing-v2/screens",()=>({ReceiptDialog:()=>null,PaymentRecordDialog:()=>null,SupplierPaymentDialog:()=>null,UnpaidReceiptQueue:()=> <p>Danh sách phiếu chưa thanh toán</p>}));
import {DebtsScreen} from "./debts-screen";
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("opens the supplier statement inline and preserves real opening/closing balances",async()=>{
 const supplier={id:"529ec3ce-af8f-42f7-a08f-4bab36ba7e65",name:"NCC QA",phoneNumber:"0900000001"};
 read.mockImplementation(async query=>({status:"success",data:query.action==="statement"?{supplier,from:"2026-11-01",to:"2026-11-08",openingDebt:100,closingDebt:250,debtToday:250,entries:[]}:{page:{items:[{supplier,debt:250,debtAgeDays:2}],page:1,pageSize:20,total:1},totalOwed:250,totalAdvance:0}}));
 render(<DebtsScreen/>);fireEvent.click(await screen.findByText("0900000001"));
 expect(await screen.findByText("Công nợ đầu kỳ · 01/11/2026")).toBeTruthy();expect(screen.getByText("Công nợ cuối kỳ · 08/11/2026")).toBeTruthy();expect(screen.queryByRole("dialog")).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Phiếu nhập chưa thanh toán"}));expect(screen.getByText("Danh sách phiếu chưa thanh toán")).toBeTruthy();
});
