"use client";

import { useId, useState } from "react";
import { DirectoryEmpty, StatusPill } from "@/components/ui/management-page";
import { vietnameseBusinessDate } from "@/shared/format/date-only";
import { missingZoneDocuments } from "../domain/zone-document-state";
import type { ZoneWorkspace } from "../domain/farming-zone";
import { zoneInputStyles } from "./zone-field";
import { useDirectoryView } from "@/components/ui/use-directory-view";
import { InterfaceIcon } from "@/components/ui/interface-icon";

export function ZoneDirectory({
  workspace,
  onSelect,
}: {
  workspace: ZoneWorkspace;
  onSelect(id: string): void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useDirectoryView("zones", "table", ["table", "grid"] as const);
  const id = useId();
  const query = search
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
  const zones = workspace.zones.filter(
    (zone) =>
      (status === "all" || zone.status === status) &&
      [zone.code, zone.name, zone.location]
        .join(" ")
        .toLocaleLowerCase("vi")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/đ/g, "d")
        .includes(query),
  );
  return (
    <section aria-label="Danh sách vùng nuôi">
      <div className="mb-4 grid gap-3 rounded-card border border-border bg-[#fafbf9] p-3.5 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <label className="text-xs font-medium" htmlFor={`${id}-search`}>
            Tìm vùng nuôi
          </label>
          <input
            id={`${id}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên vùng, mã hoặc vị trí"
            className={zoneInputStyles}
          />
        </div>
        <div>
          <label htmlFor={`${id}-status`} className="text-xs font-medium">
            Trạng thái vùng
          </label>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={zoneInputStyles}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="in-use">Đang sử dụng</option>
            <option value="discontinued">Đã ngừng sử dụng</option>
          </select>
        </div>
      </div>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-xs font-medium text-text">Danh mục vùng nuôi</h2>
          <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-medium text-text-muted" aria-live="polite">{zones.length} vùng</p><div role="group" aria-label="Cách hiển thị vùng nuôi" className="flex gap-1 rounded-control border border-border bg-surface-subtle p-1"><button type="button" title="Dạng lưới" aria-label="Dạng lưới" aria-pressed={view === "grid"} className="grid size-8 place-items-center rounded-control aria-pressed:bg-primary aria-pressed:text-white" onClick={() => setView("grid")}><InterfaceIcon name="grid" /></button><button type="button" title="Dạng bảng" aria-label="Dạng bảng" aria-pressed={view === "table"} className="grid size-8 place-items-center rounded-control aria-pressed:bg-primary aria-pressed:text-white" onClick={() => setView("table")}><InterfaceIcon name="list" /></button></div></div>
        </div>
        {view === "table" && <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem_8rem_9rem_1rem] gap-4 border-b border-border bg-[#f8f9f7] px-5 py-2 text-[11px] font-medium tracking-[.015em] text-text-muted xl:grid">
          <span>Vùng nuôi</span><span>Vị trí</span><span className="text-right">Diện tích</span><span>Hồ sơ</span><span>Trạng thái</span><span />
        </div>}
        {zones.length === 0 ? (
          <DirectoryEmpty
            title="Không có vùng phù hợp"
            description="Hãy thử tên khác hoặc thay đổi bộ lọc trạng thái."
          />
        ) : <ul className={view === "grid" ? "grid gap-3 bg-surface-subtle/40 p-4 md:grid-cols-2 xl:grid-cols-3" : "divide-y divide-border"}>
        {zones.map((zone) => {
          const missing = missingZoneDocuments(
            zone.id,
            workspace.documents,
            vietnameseBusinessDate(),
          );
          return (
            <li key={zone.id} className={view === "grid" ? "min-w-0 rounded-card border border-border bg-surface" : ""}>
              <button type="button" onClick={() => onSelect(zone.id)}
                className={`group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3 text-left transition-colors hover:bg-primary-soft/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5 ${view === "table" ? "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem_8rem_9rem_1rem]" : "min-h-44"}`}>
                <span className="min-w-0">
                  <span className="block font-mono text-[.68rem] font-semibold uppercase tracking-[.08em] text-text-muted">{zone.code}</span>
                  <span className="mt-0.5 block break-words text-sm font-semibold text-text group-hover:text-primary">{zone.name}</span>
                </span>
                <span className={view === "grid" ? "" : "xl:hidden"}><StatusPill tone={zone.status === "in-use" ? "success" : "neutral"}>{zone.status === "in-use" ? "Đang sử dụng" : "Đã ngừng"}</StatusPill></span>
                <span className={`col-span-2 min-w-0 break-words text-sm text-text-muted ${view === "table" ? "xl:col-auto" : ""}`}>{zone.location}</span>
                <span className="text-xs font-medium tabular-nums text-text xl:text-right">{zone.area.toLocaleString("vi-VN")} ha</span>
                <span className={`text-xs font-semibold ${missing.length ? "text-warning" : "text-success"}`}>{missing.length ? "Thiếu hồ sơ pháp lý" : "Đủ hồ sơ pháp lý"}</span>
                {view === "table" && <span className="hidden xl:block"><StatusPill tone={zone.status === "in-use" ? "success" : "neutral"}>{zone.status === "in-use" ? "Đang sử dụng" : "Đã ngừng"}</StatusPill></span>}
                <InterfaceIcon name="arrow" className={view === "table" ? "hidden size-4 text-text-muted xl:block" : "size-4 text-text-muted"} />
              </button>
            </li>
          );
        })}</ul>}
      </div>
    </section>
  );
}
