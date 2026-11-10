import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { vnInstant } from "@/features/purchase-documents/repository";
import * as c from "./contracts";

type Params = Record<string, string | undefined>;
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const failed = (httpStatus: number, code?: string, uncertain = false): WorkspaceResult<never> => ({ status: "error", httpStatus, code, uncertain });
const search = (values: Params) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(values)) if (value) params.append(key, value); return params; };

async function read<T>(values: Params, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch(`/api/cash-book?${search(values)}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : failed(response.status, value.code);
  } catch { return failed(0); }
}
async function write<T>(payload: unknown, schema: z.ZodType<T>): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch("/api/cash-book", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000), headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(payload) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : failed(response.status, value.code, response.status === 401 || response.status >= 500 || response.ok);
  } catch { return failed(0, undefined, true); }
}

export type BookQuery = {
  fund: c.CashFund | "All"; cashAccountId: string; from?: string; to?: string; direction: "" | c.CashDirection; typeId: string; status: "" | "Recorded" | "Cancelled"; createdById: string;
  partyKind: "" | c.PartyKind; party: string; countsInResult: "" | "true" | "false"; search: string; sort: string; desc: boolean; page: number; pageSize: number;
};
const filters = (q: BookQuery): Params => ({ fund: q.fund, cashAccountId: q.cashAccountId, from: q.from, to: q.to, direction: q.direction, typeId: q.typeId, status: q.status, createdById: q.createdById,
  partyKind: q.partyKind, party: q.party.trim(), countsInResult: q.countsInResult, search: q.search.trim(), sort: q.sort, desc: String(q.desc) });
export const listBook = (q: BookQuery, signal?: AbortSignal) => read({ action: "book", ...filters(q), page: String(q.page), pageSize: String(q.pageSize) }, c.bookPage, signal);
export async function exportBook(q: BookQuery): Promise<WorkspaceResult<true>> {
  try {
    const response = await bffFetch(`/api/cash-book?${search({ action: "export", ...filters(q) })}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) { const value = await response.json(); return failed(response.status, value.code); }
    if (!response.headers.get("content-type")?.startsWith(mime)) return failed(502);
    const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
    link.href = url; link.download = "so-quy.xlsx"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { status: "success", data: true };
  } catch { return failed(0); }
}

export const getVoucher = (id: string, signal?: AbortSignal) => read({ action: "voucher", id }, c.voucherView, signal);
export type VoucherInput = {
  code: string; direction: c.CashDirection; fund: c.CashFund; cashAccountId: string; typeId: string; occurredAt: string; amount: number; collectorId: string;
  partyKind: "" | c.PartyKind; partyId: string; partyName: string; note: string; countsInResult: boolean;
};
export function saveVoucher(input: VoucherInput, id?: string, rowVersion?: string) {
  const body = { code: input.code.trim() || null, direction: input.direction, fund: input.fund, cashAccountId: input.fund === "Cash" ? null : input.cashAccountId || null, typeId: input.typeId, occurredAt: vnInstant(input.occurredAt),
    amount: input.amount, collectorId: input.collectorId || null, partyKind: input.partyKind || null, partyId: input.partyId || null, partyName: input.partyName.trim() || null, note: input.note.trim() || null, countsInResult: input.countsInResult,
    ...(rowVersion ? { rowVersion } : {}) };
  return write({ action: "save-voucher", id, body }, c.voucherView);
}
export const cancelVoucher = (id: string, reason: string, rowVersion: string) => write({ action: "cancel-voucher", id, body: { reason: reason.trim() || null, rowVersion } }, c.voucherView);

export const listAccounts = (kind?: "Bank" | "EWallet", includeInactive = false, signal?: AbortSignal) => read({ action: "accounts", kind, includeInactive: includeInactive ? "true" : undefined }, c.cashAccounts, signal);
export type AccountInput = { kind: "Bank" | "EWallet"; bankBin: string; providerName: string; accountNumber: string; holderName: string; note: string; isActive: boolean };
export const saveAccount = (input: AccountInput, id?: string, rowVersion?: string) => write({ action: "save-account", id, body: {
  kind: input.kind, bankBin: input.kind === "Bank" ? input.bankBin || null : null, providerName: input.kind === "EWallet" ? input.providerName.trim() || null : null, accountNumber: input.accountNumber.trim(), holderName: input.holderName.trim(), note: input.note.trim() || null,
  ...(id ? { isActive: input.isActive, rowVersion } : {}) } }, c.cashAccount);
export const removeAccount = (id: string) => write({ action: "remove-account", id }, c.cashAccount.or(c.removed));
export const listBanks = (signal?: AbortSignal) => read({ action: "banks" }, c.banks, signal);

export const listTypes = (direction?: c.CashDirection, signal?: AbortSignal) => read({ action: "types", direction }, c.voucherTypes, signal);
export type TypeInput = { direction: c.CashDirection; category: c.CashCategory; name: string; description: string; countsInResult: boolean };
export const saveType = (input: TypeInput, id?: string, rowVersion?: string) => write({ action: "save-type", id, body: { ...input, name: input.name.trim(), description: input.description.trim() || null, ...(id ? { rowVersion } : {}) } }, c.voucherType);
export const removeType = (id: string) => write({ action: "remove-type", id }, c.removed);

export const listCollectors = (signal?: AbortSignal) => read({ action: "collectors" }, c.people, signal);
export const listParties = (kind: c.PartyKind, text: string, signal?: AbortSignal) => read({ action: "parties", kind, search: text.trim() || undefined }, c.parties, signal);
export type PartyInput = { name: string; phoneNumber: string; address: string; area: string; ward: string; note: string };
export const createParty = (input: PartyInput) => write({ action: "create-party", body: Object.fromEntries(Object.entries(input).map(([key, value]) => [key, key === "name" ? value.trim() : value.trim() || null])) }, c.party);

export const fundLabel: Record<c.CashFund | "All", string> = { Cash: "Tiền mặt", Bank: "Ngân hàng", EWallet: "Ví điện tử", All: "Tổng quỹ" };
export const categoryLabel: Record<c.CashCategory, string> = { Goods: "Tiền hàng", OtherIncome: "Thu khác", TransferWithdrawal: "Chuyển/Rút", OtherExpense: "Chi phí khác", Payroll: "Lương nhân viên" };
export const partyKindLabel: Record<c.PartyKind, string> = { Customer: "Khách hàng", Supplier: "Nhà cung cấp", Employee: "Nhân viên", Other: "Khác" };
/** The categories a user-made type may belong to, per direction. */
export const userCategories: Record<c.CashDirection, c.CashCategory[]> = { Receipt: ["OtherIncome", "TransferWithdrawal"], Payment: ["OtherExpense"] };
