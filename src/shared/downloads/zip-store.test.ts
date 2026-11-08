import {expect,it} from "vitest";
import {zipStoredFiles} from "./zip-store";
it("writes interoperable stored ZIP records with the standard CRC32",async()=>{
 const bytes=new Uint8Array(await zipStoredFiles([{name:"test.xlsx",bytes:new TextEncoder().encode("123456789")}]).arrayBuffer()),view=new DataView(bytes.buffer);
 expect(view.getUint32(0,true)).toBe(0x04034b50);expect(view.getUint32(14,true)).toBe(0xcbf43926);expect(view.getUint32(18,true)).toBe(9);
 const end=bytes.length-22;expect(view.getUint32(end,true)).toBe(0x06054b50);expect(view.getUint16(end+10,true)).toBe(1);
 const central=view.getUint32(end+16,true);expect(view.getUint32(central,true)).toBe(0x02014b50);expect(view.getUint32(central+42,true)).toBe(0);
 expect(new TextDecoder().decode(bytes.slice(30,39))).toBe("test.xlsx");
});
