"use client";
import flowStyles from "./cultivation-flow.module.css";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { z } from "zod";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { CultivationProgress } from "./cultivation-progress";
import { ManagementHeading } from "@/components/ui/management-page";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "@/features/operations/lookups";
import { useScopedZones } from "@/features/api-workspace/selected-zones";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Field, Select, Skeleton, useRemote } from "@/features/operations/ui";
import { zoneCycle } from "./contracts";
import { HarvestPanel } from "./records-harvest-panel";
import { MaterialsPanel } from "./records-materials-panel";
import { SeedingPanel } from "./records-seeding-panel";
import { cycleRepo, type RecordsArea as Area } from "./records-shared";

const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);

/** Seeding, material-usage or harvest records for one raft, chosen from a paged raft rail. */
export function CultivationRecordsScreen({ area }: { area: Area }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <CultivationRecordsContent area={area} />
    </Suspense>
  );
}

// useSearchParams needs a Suspense boundary, hence the wrapper above.
function CultivationRecordsContent({ area }: { area: Area }) {
  const query = useSearchParams();
  const context = useApiWorkspace();
  const zones = useRemote(loadZones);
  // Zone and raft can be preselected through ?zoneId=&raftId= links.
  const [zone, setZone] = useState(query.get("zoneId") ?? "");
  const [raft, setRaft] = useState(query.get("raftId") ?? "");
  const [search, setSearch] = useState("");
  // The zone picker's selection scopes the list; a ?zoneId= link stays reachable.
  const { zones: available, zoneId: scopedZone } = useScopedZones(
    zones.data?.filter((v) =>
      operationAllowed(area, context.identity, context.permissions.functionPermissions, "View", v.id),
    ) ?? [],
    zone,
    query.get("zoneId") ?? undefined,
  );
  // Without an explicit choice, fall back to the first zone the user may view.
  const zoneId = String(scopedZone || available[0]?.id || "");
  const rafts = useRemote(
    useMemo(
      () => (signal: AbortSignal) =>
        zoneId
          ? cycleRepo.read("list", { zoneId }, z.array(zoneCycle), signal)
          : Promise.resolve({ status: "success" as const, data: [] }),
      [zoneId],
    ),
  );
  // The raft rail shows 8 rafts per page; the selection falls back to the first visible raft.
  const [raftPage, setRaftPage] = useState(1);
  const matchingRafts =
    rafts.data?.filter((v) => v.raftCode.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))) ?? [];
  const currentPage = Math.min(raftPage, Math.max(1, Math.ceil(matchingRafts.length / 8)));
  const visibleRafts = matchingRafts.slice((currentPage - 1) * 8, currentPage * 8);
  const selected = rafts.data?.find((v) => v.raftId === raft) ?? visibleRafts[0];
  const title = area === "seeding" ? "Thả giống" : area === "material-usages" ? "Sử dụng vật tư" : "Thu hoạch";
  return (
    <section className={flowStyles.page}>
      <ManagementHeading
        title={title}
        description={
          area === "seeding"
            ? "Theo dõi lô giống, các lần thả và tiến độ từng làn nuôi."
            : area === "material-usages"
              ? "Tra cứu vật tư đã dùng theo bè, chu kỳ và công việc bảo dưỡng."
              : "Ghi nhận chuyến thu hoạch, số lồng và sản lượng ước tính."
        }
        icon={area === "material-usages" ? "material" : "raft"}
      />
      <FilterWorkspace
        label="Vùng và bè nuôi"
        filters={
          <>
            <Select
              label="Vùng nuôi"
              value={zoneId}
              onChange={(e) => {
                setZone(e.target.value);
                setRaft("");
                setSearch("");
                setRaftPage(1);
              }}
            >
              <option value="">Chọn vùng nuôi</option>
              {available.map((v) => (
                <option key={v.id} value={v.id}>
                  {String(v.name ?? v.code)}
                </option>
              ))}
            </Select>
            <Field
              label="Tìm bè"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setRaft("");
                setRaftPage(1);
              }}
            />

            <div className={flowStyles.raftList} role="group" aria-label="Chọn bè nuôi">
              {visibleRafts.map((v) => (
                <button
                  type="button"
                  key={v.raftId}
                  aria-pressed={selected?.raftId === v.raftId}
                  onClick={() => setRaft(v.raftId)}
                >
                  <span>
                    <strong>{v.raftCode}</strong>
                    <small>{v.laneCount} làn nuôi</small>
                  </span>
                  <span className={flowStyles.raftState}>
                    {v.cycle ? (v.cycle.closeDate ? "Đã đóng" : "Đang nuôi") : "Chưa có chu kỳ"}
                  </span>
                </button>
              ))}
              {!rafts.loading && !visibleRafts.length && (
                <p className="text-sm text-text-muted">Không có bè phù hợp.</p>
              )}
            </div>
            <div className={flowStyles.railPaging}>
              <span>
                {matchingRafts.length} bè · {currentPage}/{Math.max(1, Math.ceil(matchingRafts.length / 8))}
              </span>
              <div>
                <button
                  type="button"
                  aria-label="Trang bè trước"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    setRaftPage(currentPage - 1);
                    setRaft("");
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Trang bè sau"
                  disabled={currentPage * 8 >= matchingRafts.length}
                  onClick={() => {
                    setRaftPage(currentPage + 1);
                    setRaft("");
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </>
        }
      >
        <ErrorNotice error={zones.error || rafts.error} />
        {(zones.error || rafts.error) && (
          <Button
            variant="secondary"
            onClick={() => {
              zones.reload();
              rafts.reload();
            }}
          >
            Tải lại danh mục
          </Button>
        )}
        {rafts.loading ? (
          <Skeleton />
        ) : selected ? (
          <div key={`${area}:${zoneId}:${selected.raftId}`}>
            <div className={flowStyles.raftHeading}>
              <div>
                <span className={flowStyles.eyebrow}>HỒ SƠ VẬN HÀNH</span>
                <h2>Bè {selected.raftCode}</h2>
                <p>
                  {selected.laneCount} làn nuôi ·{" "}
                  {selected.cycle
                    ? `Chu kỳ từ ${formatVietnameseDate(selected.cycle.startDate)}`
                    : "Chưa có chu kỳ nuôi"}
                </p>
              </div>
              <span className={flowStyles.state}>
                {selected.cycle ? (selected.cycle.closeDate ? "Chu kỳ đã đóng" : "Chu kỳ đang mở") : "Chưa bắt đầu"}
              </span>
            </div>
            {area !== "material-usages" && <CultivationProgress raftId={selected.raftId} zoneId={zoneId} />}
            {area === "seeding" ? (
              selected.cycle ? (
                <SeedingPanel zoneId={zoneId} raftId={selected.raftId} cycleId={selected.cycle.id} />
              ) : (
                <p className={flowStyles.empty}>Bè chưa có chu kỳ nuôi. Mở chu kỳ trước khi ghi nhận thả giống.</p>
              )
            ) : area === "material-usages" ? (
              <MaterialsPanel zoneId={zoneId} raftId={selected.raftId} />
            ) : (
              <HarvestPanel zoneId={zoneId} raftId={selected.raftId} />
            )}
          </div>
        ) : (
          <p className={flowStyles.empty}>Chọn vùng và bè để xem dữ liệu.</p>
        )}
      </FilterWorkspace>
    </section>
  );
}
