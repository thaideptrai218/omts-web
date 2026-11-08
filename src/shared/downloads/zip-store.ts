const table = Uint32Array.from({length:256},(_,index)=>{let crc=index;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);return crc>>>0;});
const crc32=(bytes:Uint8Array)=>{let crc=0xffffffff;for(const value of bytes)crc=(crc>>>8)^table[(crc^value)&255];return (crc^0xffffffff)>>>0;};
/** ZIP STORE: XLSX is already compressed. No dependency or recompression is needed. */
export function zipStoredFiles(files:readonly {name:string;bytes:Uint8Array}[]):Blob {
 if(!files.length||files.length>16)throw new Error("Invalid file count");
 const names=files.map(file=>new TextEncoder().encode(file.name));
 const total=files.reduce((size,file,index)=>size+30+names[index].length+file.bytes.length+46+names[index].length,22);
 if(total>64*1024*1024)throw new Error("Export too large");
 const bytes=new Uint8Array(total), view=new DataView(bytes.buffer);let offset=0;
 const entries=files.map((file,index)=>{const name=names[index],start=offset,crc=crc32(file.bytes);
  view.setUint32(offset,0x04034b50,true);view.setUint16(offset+4,20,true);view.setUint16(offset+6,0x800,true);view.setUint16(offset+12,0x21,true);view.setUint32(offset+14,crc,true);view.setUint32(offset+18,file.bytes.length,true);view.setUint32(offset+22,file.bytes.length,true);view.setUint16(offset+26,name.length,true);bytes.set(name,offset+30);bytes.set(file.bytes,offset+30+name.length);offset+=30+name.length+file.bytes.length;return {file,name,start,crc};
 });
 const directory=offset;
 for(const {file,name,start,crc} of entries){view.setUint32(offset,0x02014b50,true);view.setUint16(offset+4,20,true);view.setUint16(offset+6,20,true);view.setUint16(offset+8,0x800,true);view.setUint16(offset+14,0x21,true);view.setUint32(offset+16,crc,true);view.setUint32(offset+20,file.bytes.length,true);view.setUint32(offset+24,file.bytes.length,true);view.setUint16(offset+28,name.length,true);view.setUint32(offset+42,start,true);bytes.set(name,offset+46);offset+=46+name.length;}
 view.setUint32(offset,0x06054b50,true);view.setUint16(offset+8,files.length,true);view.setUint16(offset+10,files.length,true);view.setUint32(offset+12,offset-directory,true);view.setUint32(offset+16,directory,true);
 return new Blob([bytes],{type:"application/zip"});
}
