"use client";
import { useEffect, useRef, useState } from "react";
import { createOperationsRepository } from "@/features/operations/repository";
import { operationError } from "@/features/operations/ui";
import { searchResult, type SearchItem } from "./contracts";

const repo = createOperationsRepository("lot-tracing");
export type SearchMode = "lotCode" | "invoiceCode";
export type SearchState = { status: "idle" } | { status: "loading" } | { status: "done"; lots: SearchItem[] } | { status: "error"; message: string };

/** Bước 1 của TRACE-02: tìm lô theo mã lô hoặc mã hóa đơn bán. Một kết quả duy nhất mở thẳng lô đó; nhiều kết quả cho chọn. */
/** `linkedCode` (from `?code=`) is searched once on opening, as a lot code. */
export function useLotSearch(linkedCode = "") {
  const [mode, setMode] = useState<SearchMode>("lotCode"), [text, setText] = useState(linkedCode);
  const [state, setState] = useState<SearchState>({ status: "idle"}), [lotId, setLotId] = useState<string>();
  const ticket = useRef(0);
  const value = text.trim(), valid = value.length > 0 && value.length <= 100;

  async function search() {
    if (!valid) return;
    const mine = ++ticket.current;
    setLotId(undefined); setState({ status: "loading" });
    const result = await repo.read("search", { [mode]: value }, searchResult);
    if (mine !== ticket.current) return; // Một lần tìm mới hơn đã bắt đầu: bỏ kết quả cũ.
    if (result.status !== "success") return setState({ status: "error", message: operationError(result) });
    setState({ status: "done", lots: result.data.lots });
    if (result.data.lots.length === 1) setLotId(result.data.lots[0].id);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the linked code
  useEffect(() => { if (linkedCode) void Promise.resolve().then(search); }, []);
  return { mode, setMode, text, setText, state, valid, search, lotId, openLot: setLotId };
}
