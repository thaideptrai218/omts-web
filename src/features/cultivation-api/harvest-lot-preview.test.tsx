// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
const {read,write}=vi.hoisted(()=>({read:vi.fn(),write:vi.fn()}));
vi.mock("@/features/operations/repository",()=>({createOperationsRepository:()=>({read,write})}));
import {HarvestLotPreview} from "./harvest-lot-preview";
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("reads a lot in its zone and renders backend figures without treating estimated kg as sold",async()=>{
 read.mockResolvedValue({status:"success",data:{id:"lot",lotCode:"B1-LOT",raftCode:"B1",zoneCode:"V01",harvestedAt:"2026-11-08T08:00:00+07:00",recordedByName:"Nhân viên QA",laneNumbers:[1,2],finishedLaneNumbers:[1],cageCount:8,kgPerCage:50,estimatedKg:400,figures:{invoicedKg:180,soldKg:160,returnedKg:20,remainingKg:220,lostKg:0,differenceKg:20,notFinal:true},photos:[]}});
 render(<HarvestLotPreview id="lot" zoneId="zone" onClose={()=>{}} onSaved={()=>{}}/>);
 // Cage count leads; the estimate is a secondary approximate kg line, remaining shows exact kg plus approximate cages.
 expect(await screen.findByText("8 lồng")).toBeTruthy();expect(screen.getByText("≈ 400 kg")).toBeTruthy();expect(screen.getByText("160 kg")).toBeTruthy();expect(screen.getByText("220 kg")).toBeTruthy();expect(screen.getByText("≈ 4,4 lồng")).toBeTruthy();expect(screen.getByText("Số liệu chưa chốt vì lô còn đang bán.")).toBeTruthy();
 expect(read.mock.calls[0].slice(0,2)).toEqual(["detail",{id:"lot",zoneId:"zone"}]);expect(write).not.toHaveBeenCalled();expect(screen.queryByRole("dialog")).toBeNull();
});
