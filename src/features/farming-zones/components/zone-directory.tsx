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
      <div className="mb-5 grid gap-4 rounded-card border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
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
      <p className="mb-3 text-sm text-text-muted" aria-live="polite">
        {zones.length} vùng nuôi
      </p>
      {zones.length === 0 && (
        <DirectoryEmpty
          title="Không có vùng phù hợp"
          description="Hãy thử tên khác hoặc thay đổi bộ lọc trạng thái."
        />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {zones.map((zone) => {
          const missing = missingZoneDocuments(
            zone.id,
            workspace.documents,
            vietnameseBusinessDate(),
          );
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelect(zone.id)}
              className="group min-w-0 rounded-card border border-border bg-surface p-5 text-left shadow-card transition duration-200 hover:border-primary/50 hover:shadow-lg motion-reduce:transition-none sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <InterfaceIcon name="zone" />
                </span>
                <StatusPill
                  tone={zone.status === "in-use" ? "success" : "neutral"}
                >
                  {zone.status === "in-use" ? "Đang sử dụng" : "Đã ngừng"}
                </StatusPill>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {zone.code}
              </p>
              <h2 className="mt-1 break-words text-xl font-semibold group-hover:text-primary">
                {zone.name}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-text-muted">
                {zone.location}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-sm">
                  <strong className="text-lg tabular-nums">
                    {zone.area.toLocaleString("vi-VN")}
                  </strong>{" "}
                  ha
                </span>
                <span
                  className={`text-xs font-semibold ${missing.length ? "text-warning" : "text-success"}`}
                >
                  {missing.length ? "Thiếu hồ sơ pháp lý" : "Đủ hồ sơ pháp lý"}
                </span>
              </div>
              <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
                Xem hồ sơ vùng
                <InterfaceIcon name="arrow" className="size-4" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
