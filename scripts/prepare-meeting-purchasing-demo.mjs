const origin="http://localhost:3002";
if(!process.argv.includes("--write-demo"))throw new Error("Requires --write-demo and localhost:3002 configured for OMTS_MEETING_20261106.");
const cookies=new Map();
async function send(path,body){
 const r=await fetch(new URL(path,origin),{method:body===undefined?"GET":"POST",signal:AbortSignal.timeout(60000),headers:{Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join("; "),...(body===undefined?{}:{Origin:origin,"X-OMTS-Request":"web",...(body===null?{}:{"Content-Type":"application/json"})})},body:body==null?undefined:JSON.stringify(body)});
 for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(";",1)[0],i=pair.indexOf("=");if(/Max-Age=0/i.test(cookie))cookies.delete(pair.slice(0,i));else cookies.set(pair.slice(0,i),pair.slice(i+1));}
 const v=await r.json();if(!r.ok)throw new Error(`${path.split("?")[0]} HTTP ${r.status} ${v.code??v.status}`);return v.data??v;
}
async function login(identifier){await send("/api/auth/login",{identifier,password:process.env.OMTS_QA_PASSWORD||"Demo@1234"});}
async function logout(){await send("/api/auth/logout",null);}
const write=(area,action,id,body)=>send(`/api/operations/${area}`,{action,id,body});
try{
 await login("owner");
 const suppliers=(await send("/api/workspace/suppliers?page=1&pageSize=100")).items;
 const items=(await send("/api/workspace/input-items?page=1&pageSize=100&group=Material&statusId=101")).items;
 const supplier=suppliers.find(v=>v.statusId===101&&v.supplierType==="Material"),item=items[0];
 if(!supplier||!item)throw new Error("No demo supplier/material");
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const draft=await write("purchase-receipts","create",undefined,{supplierId:supplier.id,receiptDate:today,notes:"Dữ liệu demo buổi họp 06/11/2026",complete:false,rowVersion:null,lines:[{itemId:item.id,quantity:2,unitPrice:1000,supplierLotCode:null,raftId:null}]});
 console.log(`receipt draft saved ${draft.code}`);
 const completed=await write("purchase-receipts","complete",draft.id,{rowVersion:draft.rowVersion});
 console.log(`receipt completed total=${completed.total}`);
 console.log(`session after receipt write ${(await send("/api/auth/session")).status}`);
 await logout();await login("ketoan");
 const payment=await write("supplier-payments","create",undefined,{supplierId:supplier.id,kind:"Payment",paymentDate:today,amount:2000,method:"Cash",bankReference:null,note:"Dữ liệu demo buổi họp 06/11/2026",confirmAdvance:false,confirmDuplicateBankReference:false,deduplicationKey:crypto.randomUUID()});
 console.log(`accountant payment saved ${payment.code}`);
 console.log(`session after payment write ${(await send("/api/auth/session")).status}`);
 await logout();await login("owner");
 const returned=await write("purchase-receipts","return",completed.id,{reason:"Demo trả một đơn vị vật tư, buổi họp 06/11/2026",ownerApproved:false,lines:[{receiptLineId:completed.lines[0].id,quantity:1}]});
 console.log(`purchase return saved amount=${returned.returned}`);
 await logout();await login("ketoan");
 const refund=await write("supplier-payments","create",undefined,{supplierId:supplier.id,kind:"PaidBack",paymentDate:today,amount:1000,method:"Cash",bankReference:null,note:"Demo nhà cung cấp hoàn tiền sau trả hàng 06/11/2026",confirmAdvance:false,confirmDuplicateBankReference:false,deduplicationKey:crypto.randomUUID()});
 console.log(`supplier paid back saved ${refund.code}`);
 const current=await send(`/api/operations/supplier-payments?action=debt&supplierId=${supplier.id}`);
 console.log(`debt read after writes ${current.debtToday}`);
}catch(error){console.error(error.message);process.exitCode=1;}
finally{try{await logout();}catch{/* no session secrets output */}}
