"use client";
import { SelectBox } from "@/components/ui/select-box";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { EditorFrame, ItemFinder, OverflowMenu, QuantityStepper, SideRow, fmt, nowLocal, vnLocal } from "@/features/purchase-documents/document-parts";
import { usePurchaseLookups } from "@/features/purchase-documents/repository";
import { baseUnitOf, unitChoices, type ItemGroup, type ItemOption } from "@/features/purchase-documents/types";
import { UnitCell } from "@/features/purchase-documents/unit-cell";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import { IN_USE, ISSUE, issueStatusLabel, type IssueKind, type IssueLine, type IssueView, type ItemRow, type SeedLots } from "@/features/input-items/contracts";
import { errorText, inputRepository, issueRepository, problemText } from "@/features/input-items/repository";
import { itemHref, kindInfo, useIssueAccess, useIssueTypes, useReceivers, useZoneOptions, type IssueAccess } from "./issue-access";
import styles from "./input-issues.module.css";

/** `unitId` is the unit the quantity is typed in; `costPerBase` and `onHand` are per base unit. */
type Line = {
  key: string; item: ItemOption; unitId: string | null; unitName: string; unitFactor: number; quantity: string;
  /** The lot a Seed line draws from; empty draws from the quantity that has no lot. `lotTouched` is false until the default has been chosen. */
  lotId: string; lotCode: string; lotTouched: boolean; note: string; costPerBase: number | null; onHand: number | null;
};
type LotState = { data: SeedLots } | { error: string };
type Saved = { id: string; rowVersion: string; statusId: number; code: string };

const quantityOf = (value: string) => { const parsed = Number(value.replace(",", ".")); return value && Number.isFinite(parsed) && parsed > 0 ? parsed : null; };
const groupOf = (value: string): ItemGroup => value === "Seed" || value === "Material" ? value : "Other";
const costOf = (line: Line) => (line.costPerBase ?? 0) * line.unitFactor;
const valueOf = (line: Line) => Math.round((quantityOf(line.quantity) ?? 0) * costOf(line));
const optionOf = (item: ItemRow): ItemOption => ({ id: item.id, code: item.code, name: item.name, unit: item.unit, group: groupOf(item.group), units: item.units.map((unit) => ({ id: unit.id, name: unit.name, factor: unit.factor, code: unit.code, isBase: unit.isBase })) });

/** A new line of an item starts in its base unit, with the quantity 1. */
function newLine(item: ItemRow): Line {
  const option = optionOf(item), base = baseUnitOf(option);
  return { key: crypto.randomUUID(), item: option, unitId: base?.id ?? null, unitName: base?.name ?? item.unit, unitFactor: base?.factor ?? 1, quantity: "1", lotId: "", lotCode: "", lotTouched: item.group !== "Seed", note: "", costPerBase: item.costPrice ?? null, onHand: item.onHand };
}

function lineFrom(source: IssueLine, items: ReadonlyMap<string, ItemRow>, keepCost: boolean): Line {
  const item = items.get(source.itemId);
  const option: ItemOption = item ? optionOf(item) : { id: source.itemId, code: source.itemCode, name: source.itemName, unit: source.baseUnit ?? source.unit, group: groupOf(source.group ?? "Other"), units: [] };
  const stored = source.unitCost != null && source.unitFactor ? source.unitCost / source.unitFactor : null;
  return { key: crypto.randomUUID(), item: option, unitId: source.itemUnitId ?? baseUnitOf(option)?.id ?? null, unitName: source.unit, unitFactor: source.unitFactor, quantity: String(source.quantity),
    lotId: source.seedLotLineId ?? "", lotCode: source.seedLotCode ?? "", lotTouched: true, note: source.note ?? "", costPerBase: keepCost ? stored ?? item?.costPrice ?? null : item?.costPrice ?? null, onHand: item?.onHand ?? null };
}

/** Create an issue, continue a draft, edit a completed one, or start from a copy: one page, the source decides the starting values. */
export function IssueEditorPage({ kind, id, copyFrom, itemId }: { kind: IssueKind; id?: string; copyFrom?: string; itemId?: string }) {
  const access = useIssueAccess(kind), use = kind === "Use", source = id ?? copyFrom;
  const remote = useRemote<IssueView | undefined>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<IssueView | undefined>> => source ? issueRepository.detail(source, signal) : { status: "success", data: undefined }, [source]));
  const items = useRemote<ItemRow[]>(useCallback((signal: AbortSignal) => inputRepository.all({}, signal), []));
  const lookups = usePurchaseLookups(), zones = useZoneOptions(use), types = useIssueTypes(use);
  if (!(id ? access.edit : access.create)) return <ListStateMessage>{use ? "Bạn không có quyền lập hoặc sửa phiếu xuất dùng." : "Chỉ Chủ hợp tác xã ghi nhận hoặc sửa phiếu xuất hủy."}</ListStateMessage>;
  if (remote.loading || items.loading || lookups.loading || zones.loading || types.loading) return <Skeleton />;
  const failure = remote.error ?? items.error ?? zones.error ?? types.error;
  if (failure || !items.data) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { remote.reload(); items.reload(); }} retryLabel="Tải lại" />;
  const issue = remote.data;
  if (source && (!issue || issue.kind !== kind)) return <ListStateMessage>Không tìm thấy phiếu.</ListStateMessage>;
  if (id && issue?.statusId === ISSUE.cancelled) return <ListStateMessage>Phiếu {issue.code} đã hủy nên không sửa được.</ListStateMessage>;
  return <Editor kind={kind} access={access} issue={id ? issue : undefined} copy={copyFrom ? issue : undefined} items={items.data} rafts={lookups.rafts} zones={zones.zones} types={types.types} startItemId={source ? undefined : itemId} />;
}

function Editor({ kind, access, issue, copy, items, rafts, zones, types, startItemId }: {
  kind: IssueKind; access: IssueAccess; issue?: IssueView; copy?: IssueView; items: ItemRow[]; startItemId?: string; rafts: ReturnType<typeof usePurchaseLookups>["rafts"];
  zones: ReturnType<typeof useZoneOptions>["zones"]; types: ReturnType<typeof useIssueTypes>["types"];
}) {
  const info = kindInfo[kind], use = kind === "Use", router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const origin = issue ?? copy;
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const [doc, setDoc] = useState<Saved | undefined>(issue ? { id: issue.id, rowVersion: issue.rowVersion, statusId: issue.statusId, code: issue.code } : undefined);
  const completed = doc?.statusId === ISSUE.completed;
  const usableZones = zones.filter((zone) => zone.inUse);
  // "Xuất dùng" from an item of the catalogue opens a new issue with that item on the first line.
  const [lines, setLines] = useState<Line[]>(() => {
    if (origin) return origin.lines.map((line) => lineFrom(line, itemsById, !copy));
    const start = startItemId ? itemsById.get(startItemId) : undefined;
    return start && start.statusId === IN_USE ? [newLine(start)] : [];
  });
  const [issuedAt, setIssuedAt] = useState(issue ? vnLocal(issue.issuedAt) : nowLocal()), [code, setCode] = useState(issue?.code ?? "");
  const firstZone = !origin && usableZones.length === 1 ? usableZones[0].id : "";
  const [zoneId, setZoneId] = useState(origin?.zoneId ?? firstZone);
  const [raftId, setRaftId] = useState(() => { if (origin?.raftId) return origin.raftId; const own = rafts.filter((raft) => raft.zoneId === (origin?.zoneId ?? firstZone)); return own.length === 1 ? own[0].id : ""; });
  const [typeId, setTypeId] = useState(origin?.issueTypeId ?? ""), [receiverId, setReceiverId] = useState(origin?.receiverEmployeeId ?? "");
  const [reason, setReason] = useState(origin?.reason ?? ""), [notes, setNotes] = useState(origin?.notes ?? "");
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const [lots, setLots] = useState<Record<string, LotState>>({}), requested = useRef(new Set<string>());
  const receivers = useReceivers(use ? zoneId : "");
  const zoneRafts = rafts.filter((raft) => raft.zoneId === zoneId);
  const finderItems = useMemo<ItemOption[]>(() => items.filter((item) => item.statusId === IN_USE).map(optionOf), [items]);

  const seedItemIds = useMemo(() => [...new Set(lines.filter((line) => line.item.group === "Seed").map((line) => line.item.id))], [lines]);
  useEffect(() => {
    for (const itemId of seedItemIds) {
      if (requested.current.has(itemId)) continue;
      requested.current.add(itemId);
      void inputRepository.seedLots(itemId).then((result) => {
        setLots((current) => ({ ...current, [itemId]: result.status === "success" ? { data: result.data } : { error: errorText(result) ?? "Không tải được lô giống." } }));
        if (result.status === "success") setLines((current) => current.map((line) => line.item.id === itemId && !line.lotTouched ? { ...line, lotTouched: true, lotId: result.data.suggestedLotId ?? "" } : line));
      });
    }
  }, [seedItemIds]);

  const update = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const add = (option: ItemOption) => { const item = itemsById.get(option.id); if (item) { setLines((current) => [...current, newLine(item)]); setError(undefined); } };
  const pickUnit = (line: Line, unitId: string) => { const unit = unitChoices(line.item, { itemUnitId: line.unitId, unit: line.unitName, unitFactor: line.unitFactor }).find((row) => row.id === unitId); if (unit) update(line.key, { unitId: unit.id, unitName: unit.name, unitFactor: unit.factor }); };
  // One issue is for one zone and one raft of it: a new zone clears the raft and the receiver, and a zone with a single raft takes it.
  function changeZone(next: string) {
    const own = rafts.filter((raft) => raft.zoneId === next);
    setZoneId(next); setRaftId(own.length === 1 ? own[0].id : ""); setReceiverId(""); setError(undefined);
  }

  const total = lines.reduce((sum, line) => sum + valueOf(line), 0);
  const hasSeed = lines.some((line) => line.item.group === "Seed");
  async function save(complete: boolean) {
    if (pending) return;
    const finishing = complete || completed;
    if (use && !zoneId) { setError("Chọn vùng."); return; }
    if (use && !raftId) { setError("Chọn bè."); return; }
    const bad = lines.findIndex((line) => !quantityOf(line.quantity) || Math.round(quantityOf(line.quantity)! * 100) / 100 !== quantityOf(line.quantity));
    if (bad >= 0) { setError(`Dòng ${bad + 1}: nhập số lượng lớn hơn 0, tối đa 2 chữ số thập phân.`); return; }
    const unlotted = lines.findIndex((line) => line.item.group === "Seed" && !lots[line.item.id]);
    if (unlotted >= 0) { setError(`Dòng ${unlotted + 1}: đang tải lô giống. Hãy thử lại sau giây lát.`); return; }
    const lotFailed = lines.findIndex((line) => { const lot = lots[line.item.id]; return line.item.group === "Seed" && !!lot && "error" in lot; });
    if (lotFailed >= 0) { setError(`Dòng ${lotFailed + 1}: chưa tải được lô giống nên chưa lưu được. Tải lại trang rồi thử lại.`); return; }
    if (finishing) {
      if (!lines.length) { setError("Thêm ít nhất một dòng hàng."); return; }
      if (use && !typeId) { setError("Chọn loại xuất."); return; }
      if (!use && !reason.trim()) { setError("Nhập lý do xuất hủy."); return; }
    }
    const body = {
      ...(doc ? { rowVersion: doc.rowVersion } : { kind }), code: code.trim() || null, issuedAt: `${issuedAt.slice(0, 16)}:00+07:00`, notes: notes.trim() || null,
      ...(use ? { zoneId, raftId, issueTypeId: typeId || null, receiverEmployeeId: receiverId || null } : { reason: reason.trim() || null }),
      lines: lines.map((line) => ({ itemId: line.item.id, itemUnitId: line.unitId, quantity: quantityOf(line.quantity), seedLotLineId: line.item.group === "Seed" ? line.lotId || null : null, note: line.note.trim() || null })),
    };
    setPending(true); setError(undefined);
    // A new document is saved and completed in one call, so a shortage leaves nothing behind. An existing draft is saved first, then completed.
    const saved = doc ? await issueRepository.save(body, doc.id) : await issueRepository.save({ ...body, complete }, undefined);
    if (saved.status !== "success") { setPending(false); setError(problemText(saved)); return; }
    let result = saved.data;
    if (doc) {
      setDoc({ id: result.id, rowVersion: result.rowVersion, statusId: result.statusId, code: result.code });
      if (complete && !completed) {
        const done = await issueRepository.complete(result.id, result.rowVersion);
        if (done.status !== "success") { setPending(false); setError(`Đã lưu phiếu tạm ${result.code} nhưng chưa hoàn thành: ${errorText(done)}`); return; }
        result = done.data;
      }
    }
    setPending(false);
    notify({ tone: "success", title: complete && !completed ? `Đã hoàn thành phiếu ${result.code}.` : `Đã lưu phiếu ${result.code}.` });
    router.push(`${info.path}?code=${result.code}`);
  }
  async function remove() {
    if (!doc || !(await confirmation.confirm(`Xóa phiếu tạm ${doc.code}?`))) return;
    const result = await issueRepository.remove(doc.id);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa phiếu tạm ${doc.code}.` }); router.push(info.path); } else setError(errorText(result));
  }

  const missingZone = origin?.zoneId && !usableZones.some((zone) => zone.id === origin.zoneId);
  const missingRaft = origin?.raftId && origin.zoneId === zoneId && !zoneRafts.some((raft) => raft.id === origin.raftId);
  const missingReceiver = origin?.receiverEmployeeId && !receivers.receivers.some((person) => person.id === origin.receiverEmployeeId);
  const title = completed ? `Sửa phiếu ${doc?.code}` : doc ? `Phiếu tạm ${doc.code}` : copy ? `Sao chép ${copy.code}` : info.title;
  const select = (value: string, onChange: (value: string) => void, label: string, children: ReactNode, disabled = false) =>
    <SelectBox aria-label={label} disabled={disabled} value={value} onChange={(event) => { onChange(event.target.value); setError(undefined); }}>{children}</SelectBox>;

  return <EditorFrame title={title} backHref={info.path} source={copy ? `Sao chép từ phiếu ${copy.code}; kiểm tra lại số lượng và lô giống.` : completed ? "Sửa số lượng, lô giống hoặc loại xuất: số lượng còn lại được tính lại theo phiếu mới." : undefined}
    tools={<><ItemFinder placeholder="Tìm hàng hóa theo mã hoặc tên" items={finderItems} onPick={add} />{doc && doc.statusId === ISSUE.draft && access.remove && <OverflowMenu actionLabel="Xóa phiếu tạm" onAction={() => void remove()} />}</>}>
    {confirmation.dialog}
    <div className={purchaseStyles.editorBody}>
      <div className={purchaseStyles.linesPanel}>
        <table className={purchaseStyles.lines}><thead><tr><th className={purchaseStyles.narrow} /><th className={purchaseStyles.narrow}>STT</th><th>Mã hàng</th><th>Tên hàng</th><th>ĐVT</th>{hasSeed && <th>Lô giống</th>}
          <th className={purchaseStyles.num}>Số lượng</th><th className={purchaseStyles.num}>Giá vốn</th><th className={purchaseStyles.num}>Giá trị</th></tr></thead>
          <tbody>{lines.map((line, index) => {
            const lot = lots[line.item.id], position = index + 1, seed = line.item.group === "Seed";
            return <tr key={line.key}>
              <td className={purchaseStyles.narrow}><button type="button" className={purchaseStyles.remove} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}><InterfaceIcon name="trash" /></button></td>
              <td className={purchaseStyles.narrow}>{position}</td>
              <td><Link className={purchaseStyles.code} href={itemHref(line.item.code)} target="_blank">{line.item.code}</Link></td>
              <td className={styles.nameCell}>{line.item.name}<input className={styles.noteInline} aria-label={`Ghi chú dòng ${position}`} placeholder="Ghi chú..." maxLength={500} value={line.note} onChange={(event) => update(line.key, { note: event.target.value })} /></td>
              <td className={styles.unitCell}><UnitCell line={{ item: line.item, itemUnitId: line.unitId, unitName: line.unitName, unitFactor: line.unitFactor }} index={index} onPick={(unitId) => pickUnit(line, unitId)} /></td>
              {hasSeed && <td className={styles.lotCell}>{!seed ? "—" : !lot ? <span className={styles.muted}>Đang tải lô…</span> : "error" in lot ? <span className={styles.lotError} role="alert">{lot.error}</span>
                : <SelectBox aria-label={`Lô giống dòng ${position}`} className={purchaseStyles.cellSelect} value={line.lotId} onChange={(event) => update(line.key, { lotId: event.target.value })}>
                  <option value="">Chưa gắn lô (còn {fmt(lot.data.unlottedQuantity)}{lot.data.unit ? ` ${lot.data.unit}` : ""})</option>
                  {line.lotId && !lot.data.lots.some((row) => row.seedLotLineId === line.lotId) && <option value={line.lotId}>{line.lotCode || "Lô đã chọn"}</option>}
                  {lot.data.lots.map((row) => <option key={row.seedLotLineId} value={row.seedLotLineId}>{row.code} · còn {fmt(row.onHand)}{lot.data.unit ? ` ${lot.data.unit}` : ""}</option>)}</SelectBox>}</td>}
              <td className={purchaseStyles.num}><QuantityStepper label={`số lượng dòng ${position}`} value={line.quantity} onChange={(quantity) => update(line.key, { quantity })} />{line.onHand != null && !(seed && line.lotId) && <span className={purchaseStyles.cap}>còn {fmt(line.onHand / line.unitFactor)}</span>}</td>
              <td className={styles.costCell}>{fmt(costOf(line))}</td>
              <td className={purchaseStyles.amount}>{fmt(valueOf(line))}</td>
            </tr>;
          })}</tbody></table>
        {!lines.length && <div className={purchaseStyles.emptyLines}><InterfaceIcon name="material" /><strong>Chưa có hàng trong phiếu</strong><span>Tìm hàng theo mã hoặc tên ở ô phía trên để thêm dòng.</span></div>}
      </div>
      <aside className={purchaseStyles.side} aria-label={`Thông tin ${info.noun}`}>
        <div className={purchaseStyles.sideScroll}>
          {/* Same frame as the purchase receipt: who and when on top, then where the goods go, then the code and status. */}
          <div className={purchaseStyles.sideTop}><div className={purchaseStyles.person} title="Người lập"><InterfaceIcon name="user" /><span>{issue?.createdBy ?? access.username}</span></div><DatePickerField label="Thời gian" withTime value={issuedAt} max={nowLocal()} onChange={setIssuedAt} /></div>
          {use && <div className={styles.placeRow}>
            {select(zoneId, changeZone, "Vùng", <><option value="">Chọn vùng *</option>{missingZone && <option value={origin?.zoneId ?? ""}>{origin?.zoneCode}</option>}{usableZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</>)}
            {select(raftId, setRaftId, "Bè", <><option value="">Chọn bè *</option>{missingRaft && <option value={origin?.raftId ?? ""}>{origin?.raftCode}</option>}{zoneRafts.map((raft) => <option key={raft.id} value={raft.id}>{raft.code}</option>)}</>, !zoneId)}
          </div>}
          <SideRow label={info.codeLabel}><input aria-label={info.codeLabel} maxLength={30} placeholder="Mã phiếu tự động" title="Để trống để hệ thống tự cấp mã" value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></SideRow>
          <SideRow label="Trạng thái">{issueStatusLabel[doc?.statusId ?? ISSUE.draft]}</SideRow>
          {use && <>
            <SideRow label="Loại xuất">{select(typeId, setTypeId, "Loại xuất", <><option value="">Chọn loại xuất</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</>)}</SideRow>
            <SideRow label="Người nhận">{select(receiverId, setReceiverId, "Người nhận", <><option value="">{zoneId ? "Chưa chọn" : "Chọn vùng trước"}</option>{missingReceiver && <option value={origin?.receiverEmployeeId ?? ""}>{origin?.receiverName}</option>}{receivers.receivers.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</>, !zoneId)}</SideRow>
          </>}
          <div className={purchaseStyles.divider} />
          <SideRow label={`Tổng giá trị (${lines.length})`} strong>{fmt(total)}</SideRow>
          {!use && <textarea className={purchaseStyles.sideNote} aria-label="Lý do" placeholder="Lý do xuất hủy *" maxLength={1000} value={reason} onChange={(event) => { setReason(event.target.value); setError(undefined); }} />}
          <textarea className={purchaseStyles.sideNote} aria-label="Ghi chú" placeholder="Ghi chú" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          <ErrorNotice error={error} />
        </div>
        <div className={purchaseStyles.sideActions} style={completed ? { gridTemplateColumns: "1fr" } : undefined}>
          {completed ? <Button disabled={pending} onClick={() => void save(false)}>Lưu</Button>
            : <><Button variant="secondary" disabled={pending} onClick={() => void save(false)}>Lưu tạm</Button><Button disabled={pending} onClick={() => void save(true)}>Hoàn thành</Button></>}
        </div>
      </aside>
    </div>
  </EditorFrame>;
}
