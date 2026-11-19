"use client";
import { useEffect, useRef, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationError } from "@/features/operations/ui";
import { searchResult, seedForwardTrace, type SearchItem, type SeedForwardTrace } from "./contracts";

const repo = createOperationsRepository("lot-tracing");
export type SearchMode = "lotCode" | "invoiceCode" | "seedLot";
export type SearchState =
  | { status: "idle" } | { status: "loading" } | { status: "done"; lots: SearchItem[] }
  | { status: "seed"; result: SeedForwardTrace } | { status: "error"; message: string };
/** Bộ lọc thêm (ngày thu hoạch, bè, sản phẩm) cho tìm theo mã lô / hóa đơn; để trống là không lọc. */
export type TraceFilters = { harvestFrom: string; harvestTo: string; raftCode: string; productName: string };
export const emptyTraceFilters: TraceFilters = { harvestFrom: "", harvestTo: "", raftCode: "", productName: "" };

/**
 * Bước 1 của TRACE-02: tìm lô theo mã lô, hóa đơn bán, hoặc các bộ lọc (ngày thu hoạch, bè, sản phẩm). Một kết quả duy nhất mở thẳng lô đó; nhiều kết quả cho chọn.
 * Chế độ "lô giống / nhà cung cấp" là truy xuất xuôi để thu hồi: các lô thu hoạch từ lô giống đó, hóa đơn và khách.
 */
export function useLotSearch(initialCode = "", initialRecordId?: string) {
  const [mode, setMode] = useState<SearchMode>("lotCode"), [text, setText] = useState(initialCode), [filters, setFilters] = useState<TraceFilters>(emptyTraceFilters);
  const [state, setState] = useState<SearchState>({ status: initialCode ? "loading" : "idle" }), [lotId, setLotId] = useState<string>();
  const ticket = useRef(0);
  useEffect(() => {
    if (!initialCode.trim()) return;
    const mine = ++ticket.current;
    let active = true;
    void repo.read("search", { lotCode: initialCode.trim() }, searchResult).then(result => {
      if (!active || mine !== ticket.current) return;
      if (result.status !== "success") return setState({ status: "error", message: operationError(result) });
      setState({ status: "done", lots: result.data.lots });
      const exact = result.data.lots.find(lot => initialRecordId ? lot.id === initialRecordId : lot.lotCode === initialCode.trim());
      if (exact) setLotId(exact.id);
    });
    return () => { active = false; };
  }, [initialCode, initialRecordId]);
  const value = text.trim(), seed = mode === "seedLot";
  const extra: Record<string, string> = Object.fromEntries(Object.entries(filters).map(([key, entry]) => [key, entry.trim()] as const).filter(([, entry]) => entry));
  const hasFilter = !seed && Object.keys(extra).length > 0;
  const valid = value.length <= 100 && (value.length > 0 || hasFilter) && Object.values(extra).every((entry) => entry.length <= 100)
    && !(extra.harvestFrom && extra.harvestTo && extra.harvestFrom > extra.harvestTo);

  async function search() {
    if (!valid) return;
    const mine = ++ticket.current;
    setLotId(undefined); setState({ status: "loading" });
    if (seed) {
      const result = await repo.read("seed-forward", { term: value }, seedForwardTrace);
      if (mine !== ticket.current) return;
      return setState(result.status !== "success" ? { status: "error", message: operationError(result) } : { status: "seed", result: result.data });
    }
    const result = await repo.read("search", { ...(value ? { [mode]: value } : {}), ...extra }, searchResult);
    if (mine !== ticket.current) return; // Một lần tìm mới hơn đã bắt đầu: bỏ kết quả cũ.
    if (result.status !== "success") return setState({ status: "error", message: operationError(result) });
    setState({ status: "done", lots: result.data.lots });
    if (result.data.lots.length === 1) setLotId(result.data.lots[0].id);
  }
  return { mode, setMode, text, setText, filters, setFilters, hasFilter, state, valid, search, lotId, openLot: setLotId };
}
