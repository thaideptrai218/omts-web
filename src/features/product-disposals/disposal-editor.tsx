"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { useZoneOptions } from "@/features/input-issues/issue-access";
import issueStyles from "@/features/input-issues/input-issues.module.css";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { EditorFrame, ItemFinder, OverflowMenu, QuantityStepper, SideRow, fmt, nowLocal, vnLocal } from "@/features/purchase-documents/document-parts";
import purchaseStyles from "@/features/purchase-documents/purchases.module.css";
import type { ItemOption } from "@/features/purchase-documents/types";
import { DISPOSAL, IN_USE, disposalStatusLabel, type DisposalView, type ProductLots, type ProductRow } from "@/features/products/contracts";
import { useDisposalAccess } from "@/features/products/product-access";
import { LotLink } from "@/features/products/lot-link";
import { productHref } from "@/features/products/product-helpers";
import { disposalRepository, errorText, problemText, productRepository } from "@/features/products/repository";
import { DISPOSALS_PATH, disposalHref } from "./disposal-parts";

/** One line: a product and the harvest lot of the disposal's zone it is taken from, with the kg. */
type Line = { key: string; productId: string; productCode: string; productName: string; lotId: string; lotCode: string; kg: string; note: string };
type LotState = { data: ProductLots } | { error: string };
type Saved = { id: string; rowVersion: string; statusId: number; code: string };

const kgOf = (value: string) => { const parsed = Number(value.replace(",", ".")); return value && Number.isFinite(parsed) && parsed > 0 ? parsed : null; };
const optionOf = (product: ProductRow): ItemOption => ({ id: product.id, code: product.code, name: product.name, unit: "kg", group: "Other", units: [] });
const newLine = (product: { id: string; code: string; name: string }): Line => ({ key: crypto.randomUUID(), productId: product.id, productCode: product.code, productName: product.name, lotId: "", lotCode: "", kg: "", note: "" });
const lineFrom = (source: DisposalView["lines"][number]): Line => ({ key: crypto.randomUUID(), productId: source.productId, productCode: source.productCode, productName: source.productName, lotId: source.harvestLotId, lotCode: source.lotCode, kg: String(source.kg), note: source.note ?? "" });

/** Reads the lots of a product into `setLots`; a failed read is kept as the error of that product's lines until it is read again. */
function fetchLots(productId: string, setLots: Dispatch<SetStateAction<Record<string, LotState>>>) {
  void productRepository.lots(productId).then((result) => setLots((current) => ({ ...current, [productId]: result.status === "success" ? { data: result.data } : { error: errorText(result) ?? "Không tải được lô thu hoạch." } })));
}

/** Create a disposal, continue a draft, edit a completed one, or start from a copy: one page, the source decides the starting values. */
export function DisposalEditorPage({ id, copyFrom }: { id?: string; copyFrom?: string }) {
  const access = useDisposalAccess(), source = id ?? copyFrom;
  const remote = useRemote<DisposalView | undefined>(useCallback(async (signal: AbortSignal): Promise<WorkspaceResult<DisposalView | undefined>> => source ? disposalRepository.detail(source, signal) : { status: "success", data: undefined }, [source]));
  const products = useRemote<ProductRow[]>(useCallback((signal: AbortSignal) => productRepository.all({}, signal), []));
  const zones = useZoneOptions();
  if (!(id ? access.edit : access.create)) return <ListStateMessage>Bạn không có quyền lập hoặc sửa phiếu xuất hủy hàu.</ListStateMessage>;
  if (remote.loading || products.loading || zones.loading) return <Skeleton />;
  const failure = remote.error ?? products.error ?? zones.error;
  if (failure || !products.data) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { remote.reload(); products.reload(); }} retryLabel="Tải lại" />;
  const disposal = remote.data;
  if (source && !disposal) return <ListStateMessage>Không tìm thấy phiếu.</ListStateMessage>;
  if (id && disposal?.statusId === DISPOSAL.cancelled) return <ListStateMessage>Phiếu {disposal.code} đã hủy nên không sửa được.</ListStateMessage>;
  return <Editor access={access} disposal={id ? disposal : undefined} copy={copyFrom ? disposal : undefined} products={products.data} zones={zones.zones} />;
}

function Editor({ access, disposal, copy, products, zones }: { access: ReturnType<typeof useDisposalAccess>; disposal?: DisposalView; copy?: DisposalView; products: ProductRow[]; zones: ReturnType<typeof useZoneOptions>["zones"] }) {
  const router = useRouter(), confirmation = useActionDialog(), { notify } = useToast();
  const origin = disposal ?? copy;
  const [doc, setDoc] = useState<Saved | undefined>(disposal ? { id: disposal.id, rowVersion: disposal.rowVersion, statusId: disposal.statusId, code: disposal.code } : undefined);
  const completed = doc?.statusId === DISPOSAL.completed;
  const usableZones = zones.filter((zone) => zone.inUse);
  const [lines, setLines] = useState<Line[]>(() => origin?.lines.map(lineFrom) ?? []);
  const [disposedAt, setDisposedAt] = useState(disposal ? vnLocal(disposal.disposedAt) : nowLocal()), [code, setCode] = useState(disposal?.code ?? "");
  const [zoneId, setZoneId] = useState(origin?.zoneId ?? (usableZones.length === 1 ? usableZones[0].id : ""));
  const [reason, setReason] = useState(origin?.reason ?? ""), [notes, setNotes] = useState(origin?.notes ?? "");
  const [error, setError] = useState<string>(), [pending, setPending] = useState(false);
  const [lots, setLots] = useState<Record<string, LotState>>({}), requested = useRef(new Set<string>());
  const finderItems = useMemo<ItemOption[]>(() => products.filter((product) => product.statusId === IN_USE).map(optionOf), [products]);

  // The lots a product was harvested in are read once per product; each line then picks one of its zone.
  const productIds = useMemo(() => [...new Set(lines.map((line) => line.productId))], [lines]);
  useEffect(() => {
    for (const productId of productIds) {
      if (requested.current.has(productId)) continue;
      requested.current.add(productId);
      fetchLots(productId, setLots);
    }
  }, [productIds]);
  const lotsOf = (line: Line) => { const state = lots[line.productId]; return state && "data" in state ? state.data.lots.filter((lot) => lot.zoneId === zoneId) : undefined; };

  const update = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const add = (option: ItemOption) => { const product = products.find((row) => row.id === option.id); if (product) { setLines((current) => [...current, newLine(product)]); setError(undefined); } };
  // One disposal is for one zone: a new zone drops the lot of every line, since the lot must be of that zone.
  function changeZone(next: string) { setZoneId(next); setLines((current) => current.map((line) => ({ ...line, lotId: "", lotCode: "" }))); setError(undefined); }

  const total = lines.reduce((sum, line) => sum + (kgOf(line.kg) ?? 0), 0);
  async function save(complete: boolean) {
    if (pending) return;
    const finishing = complete || completed;
    if (!zoneId) { setError("Chọn vùng."); return; }
    const noLot = lines.findIndex((line) => !line.lotId);
    if (noLot >= 0) { setError(`Dòng ${noLot + 1}: chọn lô thu hoạch.`); return; }
    const bad = lines.findIndex((line) => !kgOf(line.kg) || Math.round(kgOf(line.kg)! * 1000) / 1000 !== kgOf(line.kg));
    if (bad >= 0) { setError(`Dòng ${bad + 1}: nhập số kg lớn hơn 0, tối đa 3 chữ số thập phân.`); return; }
    const seen = new Set<string>(), repeated = lines.findIndex((line) => { const pair = `${line.productId}:${line.lotId}`; if (seen.has(pair)) return true; seen.add(pair); return false; });
    if (repeated >= 0) { setError(`Dòng ${repeated + 1}: sản phẩm này đã có dòng cho lô đó. Gộp số kg vào một dòng.`); return; }
    if (finishing) {
      if (!lines.length) { setError("Thêm ít nhất một dòng hàng."); return; }
      if (!reason.trim()) { setError("Nhập lý do xuất hủy."); return; }
    }
    const body = {
      ...(doc ? { rowVersion: doc.rowVersion } : {}), code: code.trim() || null, disposedAt: `${disposedAt.slice(0, 16)}:00+07:00`, zoneId, reason: reason.trim() || null, notes: notes.trim() || null,
      lines: lines.map((line) => ({ productId: line.productId, harvestLotId: line.lotId, kg: kgOf(line.kg), note: line.note.trim() || null })),
    };
    setPending(true); setError(undefined);
    // A new document is saved and completed in one call; an existing draft is saved first, then completed.
    const saved = doc ? await disposalRepository.save(body, doc.id) : await disposalRepository.save({ ...body, complete }, undefined);
    if (saved.status !== "success") { setPending(false); setError(problemText(saved)); return; }
    let result = saved.data;
    if (doc) {
      setDoc({ id: result.id, rowVersion: result.rowVersion, statusId: result.statusId, code: result.code });
      if (complete && !completed) {
        const done = await disposalRepository.complete(result.id, result.rowVersion);
        if (done.status !== "success") { setPending(false); setError(`Đã lưu phiếu tạm ${result.code} nhưng chưa hoàn thành: ${errorText(done)}`); return; }
        result = done.data;
      }
    }
    setPending(false);
    notify({ tone: "success", title: complete && !completed ? `Đã hoàn thành phiếu ${result.code}.` : `Đã lưu phiếu ${result.code}.` });
    router.push(disposalHref(result.code));
  }
  async function remove() {
    if (!doc || !(await confirmation.confirm(`Xóa phiếu tạm ${doc.code}?`))) return;
    const result = await disposalRepository.remove(doc.id);
    if (result.status === "success") { notify({ tone: "success", title: `Đã xóa phiếu tạm ${doc.code}.` }); router.push(DISPOSALS_PATH); } else setError(errorText(result));
  }

  const missingZone = origin?.zoneId && !usableZones.some((zone) => zone.id === origin.zoneId);
  const title = completed ? `Sửa phiếu ${doc?.code}` : doc ? `Phiếu tạm ${doc.code}` : copy ? `Sao chép ${copy.code}` : "Xuất hủy hàu";
  return <EditorFrame title={title} backHref={DISPOSALS_PATH} source={copy ? `Sao chép từ phiếu ${copy.code}; kiểm tra lại lô và số kg.` : completed ? "Sửa lô hoặc số kg: số còn lại của sản phẩm được tính lại theo phiếu mới." : undefined}
    tools={<><ItemFinder placeholder="Tìm sản phẩm theo mã hoặc tên" items={finderItems} onPick={add} />{doc && doc.statusId === DISPOSAL.draft && access.remove && <OverflowMenu actionLabel="Xóa phiếu tạm" onAction={() => void remove()} />}</>}>
    {confirmation.dialog}
    <div className={purchaseStyles.editorBody}>
      <div className={purchaseStyles.linesPanel}>
        <table className={purchaseStyles.lines}><thead><tr><th className={purchaseStyles.narrow} /><th className={purchaseStyles.narrow}>STT</th><th>Mã sản phẩm</th><th>Tên sản phẩm</th><th>Lô thu hoạch</th><th className={purchaseStyles.num}>Số kg hủy</th></tr></thead>
          <tbody>{lines.map((line, index) => {
            const position = index + 1, state = lots[line.productId], own = lotsOf(line);
            return <tr key={line.key}>
              <td className={purchaseStyles.narrow}><button type="button" className={purchaseStyles.remove} aria-label={`Bỏ dòng ${position}`} title="Bỏ dòng" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}><InterfaceIcon name="trash" /></button></td>
              <td className={purchaseStyles.narrow}>{position}</td>
              <td><Link className={purchaseStyles.code} href={productHref(line.productCode)} target="_blank">{line.productCode}</Link></td>
              <td className={issueStyles.nameCell}>{line.productName}<input className={issueStyles.noteInline} aria-label={`Ghi chú dòng ${position}`} placeholder="Ghi chú..." maxLength={500} value={line.note} onChange={(event) => update(line.key, { note: event.target.value })} /></td>
              <td className={issueStyles.lotCell}>{!state ? <span className={issueStyles.muted}>Đang tải lô…</span> : "error" in state ? <span className={issueStyles.lotError} role="alert">{state.error} <button type="button" className={issueStyles.link} onClick={() => { setLots((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== line.productId))); fetchLots(line.productId, setLots); }}>Tải lại</button></span>
                : !zoneId ? <span className={issueStyles.muted}>Chọn vùng trước</span>
                : <SelectBox aria-label={`Lô thu hoạch dòng ${position}`} className={purchaseStyles.cellSelect} value={line.lotId} onChange={(event) => { const lot = own?.find((row) => row.lotId === event.target.value); update(line.key, { lotId: event.target.value, lotCode: lot?.lotCode ?? "" }); setError(undefined); }}>
                  <option value="">Chọn lô</option>
                  {line.lotId && !own?.some((row) => row.lotId === line.lotId) && <option value={line.lotId}>{line.lotCode || "Lô đã chọn"}</option>}
                  {own?.map((lot) => <option key={lot.lotId} value={lot.lotId}>{lot.lotCode} · còn {fmt(lot.remainingKg)} kg</option>)}</SelectBox>}
                {line.lotId && <LotLink className={purchaseStyles.code} code={line.lotCode} target="_blank" />}</td>
              <td className={purchaseStyles.num}><QuantityStepper label={`số kg dòng ${position}`} value={line.kg} onChange={(kg) => update(line.key, { kg })} /></td>
            </tr>;
          })}</tbody></table>
        {!lines.length && <div className={purchaseStyles.emptyLines}><InterfaceIcon name="product" /><strong>Chưa có sản phẩm trong phiếu</strong><span>Chọn vùng, rồi tìm sản phẩm theo mã hoặc tên ở ô phía trên để thêm dòng.</span></div>}
      </div>
      <aside className={purchaseStyles.side} aria-label="Thông tin phiếu xuất hủy hàu">
        <div className={purchaseStyles.sideScroll}>
          <div className={purchaseStyles.sideTop}><div className={purchaseStyles.person} title="Người lập"><InterfaceIcon name="user" /><span>{disposal?.createdBy ?? access.username}</span></div><DatePickerField label="Thời gian" withTime value={disposedAt} max={nowLocal()} onChange={setDisposedAt} /></div>
          <SideRow label="Vùng *"><SelectBox aria-label="Vùng" value={zoneId} onChange={(event) => changeZone(event.target.value)}>
            <option value="">Chọn vùng</option>{missingZone && <option value={origin?.zoneId ?? ""}>{origin?.zoneCode}</option>}{usableZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code || zone.name}</option>)}</SelectBox></SideRow>
          <SideRow label="Mã xuất hủy hàu"><input aria-label="Mã xuất hủy hàu" maxLength={30} placeholder="Mã phiếu tự động" title="Để trống để hệ thống tự cấp mã" value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} /></SideRow>
          <SideRow label="Trạng thái">{disposalStatusLabel[doc?.statusId ?? DISPOSAL.draft]}</SideRow>
          <div className={purchaseStyles.divider} />
          <SideRow label={`Tổng số kg (${lines.length})`} strong>{fmt(total)}</SideRow>
          <textarea className={purchaseStyles.sideNote} aria-label="Lý do" placeholder="Lý do xuất hủy *" maxLength={1000} value={reason} onChange={(event) => { setReason(event.target.value); setError(undefined); }} />
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
