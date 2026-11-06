// Creates clearly identified demo farming records in the isolated meeting DB.
const origin = process.env.OMTS_QA_WEB_ORIGIN || "http://localhost:3002";
if (!process.argv.includes("--write-demo") || origin !== "http://localhost:3002") throw new Error("Use --write-demo only after confirming localhost:3002 targets OMTS_MEETING_20261106. This script writes demo records.");
const cookies = new Map();
async function send(path, body, form = false) {
  const response = await fetch(new URL(path, origin), { method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(60000), headers: { Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join("; "), ...(body === undefined ? {} : { Origin: origin, "X-OMTS-Request": "web", ...(body !== null && !form ? { "Content-Type": "application/json" } : {}) }) }, body: body == null ? undefined : form ? body : JSON.stringify(body) });
  for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";",1)[0], i=pair.indexOf("="); cookies.set(pair.slice(0,i),pair.slice(i+1)); }
  const value=await response.json();
  if (!response.ok) throw new Error(`${path.split("?")[0]} HTTP ${response.status} ${value.code ?? value.status}`);
  return value;
}
const write = (area, action, id, zoneId, body) => send(`/api/operations/${area}`, { action, id, zoneId, body });
try {
  await send("/api/auth/bootstrap",null);
  await send("/api/auth/login",{identifier:"owner",password:process.env.OMTS_QA_PASSWORD || "Demo@1234"});
  const zones=(await send("/api/workspace/zones?page=1&pageSize=100")).data.items;
  const zone=zones.find(v=>v.code === "DEMO-01");
  if (!zone) throw new Error("Meeting seed zone missing");
  const cycles=(await send(`/api/operations/cultivation-cycles?action=list&zoneId=${zone.id}`)).data;
  const raft=cycles.find(v=>v.raftCode === "B1-06");
  if (!raft?.canStart) throw new Error("B1-06 cannot start a new cycle; refuse duplicate demo writes");
  const cycle=(await write("cultivation-cycles","start",raft.raftId,zone.id,{startDate:null,expectedSeedQuantity:null,expectedHarvestDate:null,targetYieldKg:null})).data;
  console.log(`cycle created ${raft.raftCode}`);
  const seedLots=(await send(`/api/operations/seeding?action=seed-lots&id=${raft.raftId}&zoneId=${zone.id}`)).data.lots;
  const state=(await send(`/api/operations/seeding?action=list&id=${cycle.id}&zoneId=${zone.id}`)).data;
  const lane=state.lanes.find(v=>v.canSeed)?.laneNumber;
  if (!seedLots[0] || !lane) throw new Error("No seed lot or eligible lane");
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  await write("seeding","record",cycle.id,zone.id,{seedingDate:today,seedLotId:seedLots[0].id,laneNumbers:[lane],quantity:1});
  console.log("seeding saved");
  const items=(await send("/api/workspace/input-items?page=1&pageSize=100&group=Material&statusId=101")).data.items;
  if (!items[0]) throw new Error("No demo material item");
  await write("material-usages","record",raft.raftId,zone.id,{usageDate:today,repairReason:"Dữ liệu demo buổi họp 06/11/2026",items:[{itemId:items[0].id,quantity:1}]});
  console.log("material usage saved");
  const png = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgL8AAAAASUVORK5CYII=","base64")],{type:"image/png"});
  const log=new FormData(); log.set("payload",JSON.stringify({visitDate:today,notes:"Dữ liệu demo buổi họp 06/11/2026"})); log.append("files",png,"meeting-demo.png");
  const savedLog=await send(`/api/operations/cultivation-cycles?action=log-record&id=${cycle.id}&zoneId=${zone.id}`,log,true);
  console.log(`cultivation log saved photos=${savedLog.data.log.photos.length}`);
  const trip=new FormData(); trip.set("payload",JSON.stringify({laneNumbers:[lane],finishedLaneNumbers:[],cageCount:1,estimatedKg:10})); trip.append("files",png,"meeting-demo.png");
  const harvest=await send(`/api/operations/harvest?action=harvest-record&id=${raft.raftId}&zoneId=${zone.id}`,trip,true);
  const lot=(await send(`/api/operations/harvest?action=detail&id=${harvest.data.lot.id}&zoneId=${zone.id}`)).data;
  console.log(`harvest saved ${lot.lotCode} cages=${lot.cageCount} estimatedKg=${lot.estimatedKg} photos=${lot.photos.length}`);
} catch(error) { console.error(error.message); process.exitCode=1; }
finally { try { const state=await send("/api/auth/bootstrap",null); await send("/api/auth/logout",{expectedRevision:state.revision}); } catch { /* no credentials output */ } }
