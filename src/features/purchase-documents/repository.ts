import { useEffect, useState } from "react";
import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { loadOptions } from "@/features/operations/lookups";
import { inputRepository } from "@/features/input-items/repository";
import * as c from "./contracts";
import type { CancelPreview, ItemGroup, ItemOption, Page, PaymentMethod, PurchaseReturn, RaftOption, Receipt, ReceiptDraft, ReceiptPayment, ReceiptQuery, ReceiptRow, ReceiptTotals, ReturnDraft, ReturnQuery, ReturnRow, SupplierOption, ZoneRef } from "./types";

type Params = Record<string, string | readonly string[] | undefined>;
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const failed = (httpStatus: number, code?: string, uncertain = false): WorkspaceResult<never> => ({ status: "error", httpStatus, code, uncertain });

function search(values: Params) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) if (item) params.append(key, item);
  return params;
}
async function read<T>(values: Params, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch(`/api/purchases?${search(values)}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : failed(response.status, value.code);
  } catch { return failed(0); }
}
async function write<T>(payload: unknown, schema: z.ZodType<T>): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch("/api/purchases", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000), headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(payload) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : failed(response.status, value.code, response.status === 401 || response.status >= 500 || response.ok);
  } catch { return failed(0, undefined, true); }
}
const map = <T, U>(result: WorkspaceResult<T>, fn: (value: T) => U): WorkspaceResult<U> => result.status === "success" ? { status: "success", data: fn(result.data) } : result;

const zoneOf = (zone: { id: string; code: string; name: string } | null | undefined): ZoneRef | null => zone ? { id: zone.id, name: zone.code || zone.name } : null;
const supplierOf = (supplier: { id: string; name: string; phoneNumber: string }, code = ""): SupplierOption => ({ id: supplier.id, code, name: supplier.name, phone: supplier.phoneNumber });
const groupOf = (value: string | null | undefined): ItemGroup => value === "Seed" || value === "Material" ? value : "Other";
const ownerApprovalCodes = ["MSG-PURCHASE-02"];

/** Fallback for an API without `netUnitPrice`: the header discount spread over the lines by amount. */
function netUnit(view: c.ReceiptView, line: c.ReceiptView["lines"][number]) {
  const goods = view.lines.reduce((sum, row) => sum + (row.lineAmount ?? 0), 0), unit = (line.unitPrice ?? 0) - (line.discount ?? 0);
  return goods > 0 ? Math.round(unit * view.payable / goods) : unit;
}
function toReceipt(view: c.ReceiptView): Receipt {
  return {
    id: view.id, code: view.code, date: view.receiptDate, receivedAt: view.receivedAt ?? `${view.receiptDate}T00:00:00+07:00`, receivedBy: view.receivedBy ?? null, completedAt: view.completedAt ?? null, rowVersion: view.rowVersion, supplier: supplierOf(view.supplier), zone: zoneOf(view.zone),
    recordedBy: view.recordedBy.name, statusId: view.statusId, discount: view.discount, payable: view.payable, paid: view.paid, notes: view.notes ?? null, cancelReason: view.cancelReason ?? null,
    lines: view.lines.map((line) => ({
      id: line.id, item: { id: line.itemId ?? "", code: line.itemCode ?? "—", name: line.itemName ?? "Chưa chọn hàng", unit: line.unit, group: groupOf(line.group), units: [] },
      itemUnitId: line.itemUnitId ?? null, unitFactor: line.unitFactor ?? 1,
      quantity: line.quantity ?? null, unitPrice: line.unitPrice ?? null, raft: line.raft ? { id: line.raft.id, code: line.raft.code, zoneId: line.raft.zoneId, zoneName: line.raft.zoneCode } : null,
      supplierLotCode: line.supplierLotCode ?? null, seedLotCode: line.seedLotCode ?? null, seeded: line.seeded, returned: line.returnedQuantity, returnable: line.returnable, discount: line.discount ?? 0,
      netUnitPrice: line.netUnitPrice ?? netUnit(view, line),
    })),
    returns: view.returns.map((item) => ({ id: item.id, code: item.code, date: item.returnDate, returnedAt: item.returnedAt ?? null, reason: item.reason, value: item.netValue, statusId: item.statusId })),
  };
}
function toReturn(view: c.ReturnView, items: readonly ItemOption[]): PurchaseReturn {
  const refund = view.refunds.find((row) => row.statusId === 1801);
  return {
    id: view.id, code: view.code, date: view.returnDate, returnedAt: view.returnedAt ?? `${view.returnDate}T00:00:00+07:00`, rowVersion: view.rowVersion, receipt: view.receipt ?? null, supplier: supplierOf(view.supplier), zone: zoneOf(view.zone),
    recordedBy: view.recordedBy.name, statusId: view.statusId, reason: view.reason, discount: view.discount, value: view.returnValue, netValue: view.netValue, cancelReason: view.cancelReason ?? null,
    refund: refund ? { code: refund.code, amount: refund.amount, method: refund.method, bankReference: refund.bankReference ?? null } : null,
    lines: view.lines.map((line, index) => { const known = items.find((item) => item.id === line.itemId); return { id: `${view.id}:${index}`, receiptLineId: line.receiptLineId ?? null, itemUnitId: line.itemUnitId ?? null, unitFactor: line.unitFactor ?? 1, quantity: line.quantity, unitPrice: line.unitPrice,
      item: { id: line.itemId, code: line.itemCode, name: line.itemName, unit: line.unit, group: known?.group ?? "Other", units: known?.units ?? [] } }; }),
  };
}
const sortKey = (key: string) => key === "payable" || key === "value" ? "total" : key;

export function listReceipts(query: ReceiptQuery, signal?: AbortSignal): Promise<WorkspaceResult<Page<ReceiptRow> & { totals: ReceiptTotals }>> {
  return read({ action: "receipts", ...receiptFilters(query), page: String(query.page), pageSize: String(query.pageSize) }, c.receiptSearch, signal).then((result) => map(result, (data) => ({
    items: data.page.items, page: data.page.page, total: data.page.total, totals: { received: data.totals.receiptsTotal, returned: data.totals.returnsTotal, net: data.totals.netTotal } })));
}
const receiptFilters = (query: ReceiptQuery): Params => ({ search: query.search.trim(), statusIds: query.statusId, itemGroups: query.group, supplierId: query.supplierId, from: query.from, to: query.to, sortBy: sortKey(query.sortBy), sortDir: query.sortDir });
const returnFilters = (query: ReturnQuery): Params => ({ search: query.search.trim(), statusIds: query.statusId, source: query.source, supplierId: query.supplierId, from: query.from, to: query.to, sortBy: sortKey(query.sortBy), sortDir: query.sortDir });

export const getReceipt = (id: string, signal?: AbortSignal) => read({ action: "receipt", id }, c.receiptView, signal).then((result) => map(result, toReceipt));
export const getReceiptPayments = (id: string, signal?: AbortSignal): Promise<WorkspaceResult<ReceiptPayment[]>> => read({ action: "receipt-payments", id }, c.receiptPayments, signal).then((result) => map(result, (rows) =>
  rows.map((row) => ({ id: row.id, code: row.code, date: row.paymentDate, createdBy: row.recordedBy.name, method: row.method, statusLabel: row.statusId === 1802 ? "Đã hủy" : "Đã ghi nhận", amount: row.applied }))));
export const getReceiptCopy = (id: string, signal?: AbortSignal) => read({ action: "copy", id }, c.receiptCopy, signal);

export function saveReceipt(draft: ReceiptDraft, complete: boolean) {
  // The picker gives the cooperative's wall time; the API takes an instant with its +07:00 offset.
  const receivedAt = draft.receivedAt ? `${draft.receivedAt.slice(0, 16)}:00+07:00` : null;
  const body = { code: draft.code.trim() || null, supplierId: draft.supplierId || null, receiptDate: receivedAt ? receivedAt.slice(0, 10) : null, receivedAt, receivedById: draft.receivedById || null, notes: draft.notes || null, discount: draft.discount, zoneId: null, complete, rowVersion: draft.rowVersion ?? null,
    lines: draft.lines.map((line) => ({ lineId: line.lineId, itemId: line.itemId || null, itemUnitId: line.itemUnitId, quantity: line.quantity, unitPrice: line.unitPrice, discount: line.discount, supplierLotCode: line.supplierLotCode || null, raftId: null })) };
  return write({ action: "save-receipt", id: draft.id, body }, c.receiptView).then((result) => map(result, toReceipt));
}
export async function removeReceipts(ids: readonly string[]): Promise<WorkspaceResult<number>> {
  let done = 0, last: WorkspaceResult<number> | undefined;
  for (const id of ids) { const result = await write({ action: "remove-receipt", id }, c.removed); if (result.status === "success") done += 1; else last = result; }
  return done || !last ? { status: "success", data: done } : last;
}
export const previewCancelReceipt = (id: string): Promise<WorkspaceResult<CancelPreview>> => read({ action: "cancel-preview", id }, c.cancelPreview).then((result) => map(result, (data) => ({
  canCancel: data.canCancel, blockedBy: data.blocked ? (data.blocked.kind === "Seeded" ? `Lô giống ${data.blocked.code} đã được gieo` : `Phiếu đã có phiếu trả ${data.blocked.code}`) : null, debtBefore: data.debtBefore, debtAfter: data.debtAfter })));
export const cancelReceipt = (id: string, reason: string, rowVersion: string) => write({ action: "cancel-receipt", id, body: { reason, rowVersion } }, c.receiptView);

export function listReturns(query: ReturnQuery, signal?: AbortSignal): Promise<WorkspaceResult<Page<ReturnRow> & { totalValue: number }>> {
  return read({ action: "returns", ...returnFilters(query), page: String(query.page), pageSize: String(query.pageSize) }, c.returnSearch, signal).then((result) => map(result, (data) => ({ items: data.page.items, page: data.page.page, total: data.page.total, totalValue: data.totalValue })));
}
export const getReturn = async (id: string, signal?: AbortSignal) => { const items = await itemsPromise(); return read({ action: "return", id }, c.returnView, signal).then((result) => map(result, (view) => toReturn(view, items))); };
export function saveReturn(draft: ReturnDraft, complete: boolean) {
  const returnedAt = draft.returnedAt ? `${draft.returnedAt.slice(0, 16)}:00+07:00` : null;
  const body = { code: draft.code.trim() || null, receiptId: draft.receiptId, returnedAt, supplierId: draft.receiptId ? null : draft.supplierId || null, zoneId: null, reason: draft.reason, discount: draft.discount, ownerApproved: draft.ownerApproved, complete, rowVersion: draft.rowVersion ?? null,
    refund: complete && draft.refund && draft.refund.amount > 0 ? { amount: draft.refund.amount, method: draft.refund.method === "BankTransfer" ? "BankTransfer" as const : "Cash" as const, bankReference: draft.refund.bankReference.trim() || null } : null,
    lines: draft.lines.map((line) => draft.receiptId ? { receiptLineId: line.receiptLineId, itemId: null, unitPrice: line.unitPrice, quantity: line.quantity } : { receiptLineId: null, itemId: line.itemId, itemUnitId: line.itemUnitId, unitPrice: line.unitPrice, quantity: line.quantity }) };
  return write({ action: "save-return", id: draft.id, body }, c.returnView);
}
export const getRaftCosts = (raftId: string, signal?: AbortSignal) => read({ action: "raft-costs", raftId }, c.raftCosts, signal);
export const getPayment = (id: string, signal?: AbortSignal) => read({ action: "payment", id }, c.paymentView, signal);
export const getSupplierDebt = (supplierId: string, signal?: AbortSignal) => read({ action: "supplier-debt", id: supplierId }, c.supplierDebt, signal);
export const listPayers = (signal?: AbortSignal) => read({ action: "payers" }, c.receivers, signal);
/** Wall time from the picker to an instant at +07:00. */
export const vnInstant = (local: string) => `${local.slice(0, 16)}:00+07:00`;
export type PaymentInput = { code: string; supplierId: string; paidAt: string; paidById: string; amount: number; discountAmount: number; method: "Cash" | "BankTransfer"; cashAccountId: string; bankReference: string; note: string; confirmAdvance: boolean; confirmDuplicateBankReference: boolean; deduplicationKey: string; allocations: { receiptId: string; amount: number }[] | null };
export const createPayment = (input: PaymentInput) => write({ action: "create-payment", body: { ...input, code: input.code.trim() || null, kind: "Payment", paidAt: vnInstant(input.paidAt), paidById: input.paidById || null, cashAccountId: input.method === "BankTransfer" ? input.cashAccountId || null : null, bankReference: input.method === "BankTransfer" ? input.bankReference.trim() || null : null, note: input.note.trim() || null } }, c.paymentView);
export const editPayment = (id: string, input: { rowVersion: string; paidAt: string; paidById: string; method: "Cash" | "BankTransfer"; cashAccountId: string; bankReference: string; note: string; confirmDuplicateBankReference: boolean }) =>
  write({ action: "edit-payment", id, body: { ...input, paidAt: vnInstant(input.paidAt), paidById: input.paidById || null, cashAccountId: input.method === "BankTransfer" ? input.cashAccountId || null : null, bankReference: input.method === "BankTransfer" ? input.bankReference.trim() || null : null, note: input.note.trim() || null } }, c.paymentView);
export const cancelPayment = (id: string, reason: string, rowVersion: string) => write({ action: "cancel-payment", id, body: { reason, rowVersion } }, c.paymentView);
export const listReceivers = (signal?: AbortSignal) => read({ action: "receivers" }, c.receivers, signal);
export const needsOwnerApproval = (result: WorkspaceResult<unknown>) => result.status === "error" && result.httpStatus === 409 && ownerApprovalCodes.includes(result.code ?? "");
export const removeReturn = (id: string) => write({ action: "remove-return", id }, c.removed);
export const cancelReturn = (id: string, reason: string, rowVersion: string) => write({ action: "cancel-return", id, body: { reason, rowVersion } }, c.cancelledReturn);

export async function download(kind: "receipts" | "returns", query: ReceiptQuery | ReturnQuery): Promise<WorkspaceResult<true>> {
  const values = kind === "receipts" ? receiptFilters(query as ReceiptQuery) : returnFilters(query as ReturnQuery);
  try {
    const response = await bffFetch(`/api/purchases?${search({ action: `${kind}-export`, ...values })}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) { const value = await response.json(); return failed(response.status, value.code); }
    if (!response.headers.get("content-type")?.startsWith(mime)) return failed(502);
    const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
    link.href = url; link.download = kind === "receipts" ? "nhap-hang.xlsx" : "tra-hang-nhap.xlsx"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { status: "success", data: true };
  } catch { return failed(0); }
}

/** Pickers shared by the lists and editors: loaded once per page view, suppliers reloadable after a quick add. */
let cached: Promise<{ suppliers: SupplierOption[]; items: ItemOption[]; rafts: RaftOption[]; receivers: { id: string; name: string }[] }> | undefined;
async function loadLookups() {
  const signal = AbortSignal.timeout(30_000);
  const [suppliers, items, rafts, receivers] = await Promise.all([loadOptions("suppliers", signal), inputRepository.all({ statusId: "101" }, signal), read({ action: "rafts" }, c.raftLookup, signal), read({ action: "receivers" }, c.receivers, signal)]);
  const text = (value: unknown) => typeof value === "string" ? value : "";
  return {
    suppliers: suppliers.status === "success" ? suppliers.data.filter((row) => row.statusId === 101).map((row) => ({ id: row.id, code: text(row.code), name: text(row.name), phone: text(row.phoneNumber) })) : [],
    items: items.status === "success" ? items.data.filter((row) => row.statusId === 101).map((row): ItemOption => ({ id: row.id, code: row.code, name: row.name, unit: row.unit, group: groupOf(row.group),
      units: row.units.map((unit) => ({ id: unit.id, name: unit.name, factor: unit.factor, code: unit.code, isBase: unit.isBase })) })) : [],
    rafts: rafts.status === "success" ? rafts.data.map((row) => ({ id: row.id, code: row.code, zoneId: row.zoneId, zoneName: row.zoneCode })) : [],
    receivers: receivers.status === "success" ? receivers.data : [],
  };
}
const itemsPromise = () => (cached ??= loadLookups()).then((value) => value.items);
export function usePurchaseLookups() {
  const [value, setValue] = useState<Awaited<ReturnType<typeof loadLookups>>>();
  useEffect(() => { let live = true; void (cached ??= loadLookups()).then((data) => { if (live) setValue(data); }); return () => { live = false; }; }, []);
  return {
    suppliers: value?.suppliers ?? [], items: value?.items ?? [], rafts: value?.rafts ?? [], receivers: value?.receivers ?? [], loading: !value,
    refresh: () => { cached = loadLookups(); void cached.then(setValue); },
  };
}
export type { PaymentMethod };
