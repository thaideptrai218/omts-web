import { expect,it,vi } from "vitest";
import { readSelectionPages } from "./selection-pages";
import { matchesSelection, selectionQueries, toggleSelection } from "@/shared/presentation/filter-selection";
const signal=()=>new AbortController().signal;
it("supports all, none and multiple checks without treating none as all",async()=>{
 expect(toggleSelection("","Seed",["Seed","Material","Other"])).toBe("Material|Other");expect(matchesSelection("-","Seed")).toBe(false);
 expect(selectionQueries({page:"1"},{statusId:"-"})).toEqual([]);
 const read=vi.fn();const result=await readSelectionPages(read,{page:"1",pageSize:"10"},{statusId:"-"},signal());expect(read).not.toHaveBeenCalled();expect(result).toMatchObject({status:"success",data:{items:[],total:0}});
});
it("collects all server pages, deduplicates OR matches and pages the combined result",async()=>{
 const read=vi.fn(async(query:Record<string,string|undefined>)=>({status:"success" as const,data:{items:query.type==="Seed"?[{id:"a",name:"A"},{id:"shared",name:"C"}]:[{id:"b",name:"B"},{id:"shared",name:"C"}],page:Number(query.page),pageSize:100,total:2}}));
 const result=await readSelectionPages(read,{page:"2",pageSize:"1",search:"QA"},{type:"Seed|Other"},signal());
 expect(result).toMatchObject({status:"success",data:{items:[{id:"b"}],page:2,total:3}});expect(read.mock.calls.every(([q])=>q.search==="QA"&&q.pageSize==="100")).toBe(true);
});
it("does not silently show a partial list when a read fails or pagination repeats",async()=>{
 const failure={status:"error" as const,httpStatus:403,uncertain:false};
 expect(await readSelectionPages(async()=>failure,{}, {type:"Seed|Other"},signal())).toEqual(failure);
 const read=vi.fn(async()=>({status:"success" as const,data:{items:[{id:"a"}],page:1,pageSize:100,total:101}}));
 expect(await readSelectionPages(read,{}, {type:"Seed|Other"},signal())).toMatchObject({status:"error",httpStatus:409});
});
