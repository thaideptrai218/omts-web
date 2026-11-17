"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { inputRepository } from "@/features/input-items/repository";
import { itemHref, kindOfGroup, kindText, type StockKind } from "@/features/input-items/stock-kind";
import { Skeleton } from "@/features/operations/ui";
import { allTime } from "@/components/ui/management-screen/time-range-model";
import { getReceipt, getReturn, listReceipts, listReturns } from "./repository";
import type { ReceiptQuery, ReturnQuery } from "./types";

/**
 * The addresses from before the catalogue and the purchase documents were split by kind (`/inputs/items`, `/operations/purchase-receipts`, `/operations/purchase-returns`)
 * still open: a link made elsewhere (a notification, a bookmark) knows a code or an id, not the kind. Each finds the kind of that record and moves to the screen of its kind;
 * a link with nothing to look up goes to the Vật tư screen. The kind is never guessed from the code.
 */
const SUPPLY: StockKind = "Supply";

/** Looks the target up once and replaces the address with it. `resolve` answers the target, or nothing when the record is not found (the fallback then opens). */
function Redirect({ resolve, fallback }: { resolve(signal: AbortSignal): Promise<string | undefined>; fallback: string }) {
  const router = useRouter(), [failed, setFailed] = useState(false), latest = useRef(resolve);
  useEffect(() => { latest.current = resolve; });
  useEffect(() => {
    const controller = new AbortController();
    latest.current(controller.signal).then((target) => { if (!controller.signal.aborted) router.replace(target ?? fallback); }, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [fallback, router]);
  return failed ? <ListStateMessage error="Không mở được địa chỉ này. Hãy chọn Giống hoặc Vật tư trong menu." /> : <Skeleton />;
}

const sameCode = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
const listQuery = (code: string) => ({ search: code, statusId: "", supplierId: "", from: allTime.from, to: allTime.to, sortBy: "code", sortDir: "desc" as const, page: 1, pageSize: 15 });

/** `/inputs/items?code=…`: the item's group says which catalogue it is in. */
export function LegacyItemsRedirect() {
  const code = useSearchParams().get("code") ?? "";
  return <Redirect key={code} fallback={kindText[SUPPLY].itemsPath} resolve={async (signal) => {
    if (!code) return undefined;
    const result = await inputRepository.list({ search: code, status: "All", page: "1", pageSize: "15" }, signal);
    if (result.status !== "success") throw new Error("lookup");
    const item = result.data.items.find((row) => sameCode(row.code, code) || row.units.some((unit) => sameCode(unit.code, code)));
    return item ? itemHref(code, item.group) : undefined;
  }} />;
}

/** `/operations/purchase-receipts?code=…`. */
export function LegacyReceiptsRedirect() {
  const code = useSearchParams().get("code") ?? "";
  return <Redirect key={code} fallback={kindText[SUPPLY].receiptsPath} resolve={async (signal) => {
    if (!code) return undefined;
    const query: ReceiptQuery = { ...listQuery(code), group: "" };
    const result = await listReceipts(query, signal);
    if (result.status !== "success") throw new Error("lookup");
    const row = result.data.items.find((item) => sameCode(item.code, code));
    return row?.kind ? `${kindText[row.kind].receiptsPath}?code=${encodeURIComponent(code)}` : undefined;
  }} />;
}

/** `/operations/purchase-returns?code=…`. */
export function LegacyReturnsRedirect() {
  const code = useSearchParams().get("code") ?? "";
  return <Redirect key={code} fallback={kindText[SUPPLY].returnsPath} resolve={async (signal) => {
    if (!code) return undefined;
    const query: ReturnQuery = { ...listQuery(code), source: "" };
    const result = await listReturns(query, signal);
    if (result.status !== "success") throw new Error("lookup");
    const row = result.data.items.find((item) => sameCode(item.code, code));
    return row?.kind ? `${kindText[row.kind].returnsPath}?code=${encodeURIComponent(code)}` : undefined;
  }} />;
}

/** `/operations/purchase-receipts/{id}/edit`. */
export function LegacyReceiptEditRedirect({ id }: { id: string }) {
  return <Redirect fallback={kindText[SUPPLY].receiptsPath} resolve={async (signal) => {
    const result = await getReceipt(id, signal);
    if (result.status !== "success") throw new Error("lookup");
    return `${kindText[result.data.kind].receiptsPath}/${id}/edit`;
  }} />;
}

/** `/operations/purchase-returns/{id}/edit`. */
export function LegacyReturnEditRedirect({ id }: { id: string }) {
  return <Redirect fallback={kindText[SUPPLY].returnsPath} resolve={async (signal) => {
    const result = await getReturn(id, signal);
    if (result.status !== "success") throw new Error("lookup");
    return `${kindText[result.data.kind].returnsPath}/${id}/edit`;
  }} />;
}

/** `/operations/purchase-receipts/new?item=…` or `?copy=…`: the item or the copied receipt says the kind. */
export function LegacyReceiptNewRedirect({ item, copy }: { item?: string; copy?: string }) {
  const query = item ? `?item=${item}` : copy ? `?copy=${copy}` : "";
  return <Redirect key={query} fallback={`${kindText[SUPPLY].receiptsPath}/new${query}`} resolve={async (signal) => {
    let kind: StockKind | undefined;
    if (copy) { const result = await getReceipt(copy, signal); if (result.status !== "success") throw new Error("lookup"); kind = result.data.kind; }
    else if (item) { const result = await inputRepository.detail(item, signal); if (result.status !== "success") throw new Error("lookup"); kind = kindOfGroup(result.data.group); }
    return kind ? `${kindText[kind].receiptsPath}/new${query}` : undefined;
  }} />;
}

/** `/operations/purchase-returns/new?receipt=…`: the receipt says the kind. */
export function LegacyReturnNewRedirect({ receipt }: { receipt?: string }) {
  const query = receipt ? `?receipt=${receipt}` : "";
  return <Redirect key={query} fallback={`${kindText[SUPPLY].returnsPath}/new${query}`} resolve={async (signal) => {
    if (!receipt) return undefined;
    const result = await getReceipt(receipt, signal);
    if (result.status !== "success") throw new Error("lookup");
    return `${kindText[result.data.kind].returnsPath}/new${query}`;
  }} />;
}
