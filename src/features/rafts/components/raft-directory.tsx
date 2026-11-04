"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DirectoryEmpty, StatusPill } from "@/components/ui/management-page";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import type { RaftProfile, RaftWorkspace } from "../domain/raft";

function fold(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}
export function RaftDirectory({
  workspace,
  onSelect,
}: {
  workspace: RaftWorkspace;
  onSelect(id: string): void;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const zoneId = search.get("zoneId") ?? "";
  const status = search.get("status") ?? "";
  const query = search.get("q") ?? "";
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const applied = useRef(false);
  const searchKey = search.toString();
  useEffect(() => {
    if (applied.current) {
      resultsRef.current?.focus();
      applied.current = false;
    }
  }, [searchKey]);
  const zoneNames = new Map(
    workspace.zones.map((zone) => [zone.id, zone.label]),
  );
  const rafts = workspace.rafts
    .filter(
      (raft) =>
        (!zoneId || raft.zoneId === zoneId) &&
        (!status || raft.status === status) &&
        fold(
          `${raft.code} ${zoneNames.get(raft.zoneId) ?? ""} ${raft.location}`,
        ).includes(fold(query.trim())),
    )
    .sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }));
  function navigate(params: URLSearchParams) {
    applied.current = true;
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }
  const inputStyles =
    "mt-2 min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 text-sm";
  return (
    <section
      aria-label="Danh sách bè nuôi"
      className="min-w-0 rounded-card border border-border bg-surface"
    >
      <form
        key={searchKey}
        className="grid gap-4 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)_minmax(0,.7fr)_auto] sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const params = new URLSearchParams();
          for (const key of ["q", "zoneId", "status"]) {
            const value = String(data.get(key) ?? "").trim();
            if (value) params.set(key, value);
          }
          navigate(params);
        }}
      >
        <div className="min-w-0">
          <label htmlFor={`${id}-q`} className="text-sm font-semibold">
            Tìm bè nuôi
          </label>
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            defaultValue={query}
            className={inputStyles}
            placeholder="Mã bè, vùng hoặc vị trí"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${id}-zone`} className="text-sm font-semibold">
            Vùng nuôi
          </label>
          <select
            id={`${id}-zone`}
            name="zoneId"
            defaultValue={zoneId}
            className={inputStyles}
          >
            <option value="">Tất cả vùng được cấp</option>
            {workspace.zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
                {zone.status === "discontinued" ? " (đã ngừng)" : ""}
              </option>
            ))}
            {zoneId && !zoneNames.has(zoneId) && (
              <option value={zoneId}>Vùng không có trong phạm vi</option>
            )}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${id}-status`} className="text-sm font-semibold">
            Trạng thái bè
          </label>
          <select
            id={`${id}-status`}
            name="status"
            defaultValue={status}
            className={inputStyles}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="in-use">Đang sử dụng</option>
            <option value="discontinued">Đã ngừng</option>
          </select>
        </div>
        <Button type="submit" className="self-end sm:w-auto">
          <InterfaceIcon name="search" />
          Lọc danh sách
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <p
          ref={resultsRef}
          tabIndex={-1}
          aria-live="polite"
          className="text-sm text-text-muted"
        >
          {rafts.length} / {workspace.rafts.length} bè nuôi
        </p>
        {searchKey && (
          <button
            type="button"
            className="min-h-11 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
            onClick={() => navigate(new URLSearchParams())}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
      {!rafts.length && (
        <DirectoryEmpty
          title={
            workspace.rafts.length
              ? "Không có bè phù hợp"
              : "Chưa có bè trong phạm vi"
          }
          description={
            workspace.rafts.length
              ? "Thử mã bè khác hoặc thay đổi bộ lọc vùng và trạng thái."
              : "Danh sách sẽ hiển thị khi có bè thuộc vùng và quyền được phân công."
          }
        />
      )}
      <ul className="grid gap-3 border-t border-border bg-surface-subtle/40 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {rafts.map((raft) => (
          <RaftRow
            key={raft.id}
            raft={raft}
            zoneName={zoneNames.get(raft.zoneId) ?? "Chưa có tên vùng"}
            onSelect={() => onSelect(raft.id)}
          />
        ))}
      </ul>
    </section>
  );
}
function RaftRow({
  raft,
  zoneName,
  onSelect,
}: {
  raft: RaftProfile;
  zoneName: string;
  onSelect(): void;
}) {
  const layout = [...raft.layouts].sort((a, b) => b.version - a.version)[0];
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Xem bè ${raft.code}, ${zoneName}`}
        className="group relative grid min-h-44 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] content-between gap-4 rounded-lg border border-border bg-surface px-4 py-4 text-left shadow-[0_1px_2px_rgb(16_36_58_/_0.04)] transition-colors hover:border-primary/40 hover:bg-primary-soft/30 motion-reduce:transition-none sm:px-5"
      >
        <span className="col-span-2 min-w-0">
          <span className="flex items-start justify-between gap-3"><strong className="text-lg font-semibold text-text">{raft.code}</strong><StatusPill tone={raft.status === "in-use" ? "success" : "neutral"}>{raft.status === "in-use" ? "Đang sử dụng" : "Đã ngừng"}</StatusPill></span>
          <span className="mt-1 block break-words text-sm text-text-muted">{zoneName}</span>
        </span>
        <span className="col-span-2 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm"><span><span className="block text-xs text-text-muted">Kích thước</span><span className="mt-1 block text-text">{raft.size || "Chưa cập nhật"}</span></span><span><span className="block text-xs text-text-muted">Số làn</span><span className="mt-1 block tabular-nums text-text">{layout?.lanes.length ?? 0} làn</span></span></span>
        <InterfaceIcon
          name="arrow"
          className="absolute right-4 top-4 size-4 text-primary opacity-60 transition-transform group-hover:translate-x-0.5 sm:right-5 sm:top-5"
        />
      </button>
    </li>
  );
}
