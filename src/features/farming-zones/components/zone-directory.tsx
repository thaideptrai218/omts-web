"use client";

import { useId, useState } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DirectoryEmpty, StatusPill } from "@/components/ui/management-page";
import { vietnameseBusinessDate } from "@/shared/format/date-only";
import { missingZoneDocuments } from "../domain/zone-document-state";
import type { ZoneWorkspace } from "../domain/farming-zone";
import { zoneInputStyles } from "./zone-field";

export function ZoneDirectory({
  workspace,
  onSelect,
}: {
  workspace: ZoneWorkspace;
  onSelect(id: string): void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
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
      <div className="mb-4 grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <label className="text-sm font-semibold" htmlFor={`${id}-search`}>
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
          <label htmlFor={`${id}-status`} className="text-sm font-semibold">
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
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-text">Danh mục vùng nuôi</h2>
          <p className="text-xs font-medium text-text-muted" aria-live="polite">
            {zones.length} vùng
          </p>
        </div>
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem_8rem_9rem_1rem] gap-4 border-b border-border bg-surface-subtle px-5 py-3 text-[.7rem] font-bold uppercase tracking-[.08em] text-text-muted lg:grid">
          <span>Vùng nuôi</span><span>Vị trí</span><span className="text-right">Diện tích</span><span>Hồ sơ</span><span>Trạng thái</span><span />
        </div>
        {zones.length === 0 ? (
          <DirectoryEmpty
            title="Không có vùng phù hợp"
            description="Hãy thử tên khác hoặc thay đổi bộ lọc trạng thái."
          />
        ) : <ul className="divide-y divide-border">
        {zones.map((zone) => {
          const missing = missingZoneDocuments(
            zone.id,
            workspace.documents,
            vietnameseBusinessDate(),
          );
          return (
            <li key={zone.id}>
              <button type="button" onClick={() => onSelect(zone.id)}
                className="group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-primary-soft/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem_8rem_9rem_1rem]">
                <span className="min-w-0">
                  <span className="block font-mono text-[.68rem] font-semibold uppercase tracking-[.08em] text-text-muted">{zone.code}</span>
                  <span className="mt-1 block break-words font-semibold text-text group-hover:text-primary">{zone.name}</span>
                </span>
                <span className="lg:hidden"><StatusPill tone={zone.status === "in-use" ? "success" : "neutral"}>{zone.status === "in-use" ? "Đang sử dụng" : "Đã ngừng"}</StatusPill></span>
                <span className="col-span-2 min-w-0 break-words text-sm text-text-muted lg:col-auto">{zone.location}</span>
                <span className="text-sm font-semibold tabular-nums text-text lg:text-right">{zone.area.toLocaleString("vi-VN")} ha</span>
                <span className={`text-xs font-semibold ${missing.length ? "text-warning" : "text-success"}`}>{missing.length ? "Thiếu hồ sơ pháp lý" : "Đủ hồ sơ pháp lý"}</span>
                <span className="hidden lg:block"><StatusPill tone={zone.status === "in-use" ? "success" : "neutral"}>{zone.status === "in-use" ? "Đang sử dụng" : "Đã ngừng"}</StatusPill></span>
                <InterfaceIcon name="arrow" className="hidden size-4 text-text-muted lg:block" />
              </button>
            </li>
          );
        })}</ul>}
      </div>
    </section>
  );
}
