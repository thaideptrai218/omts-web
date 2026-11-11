"use client";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { Button } from "@/components/ui/button";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataTable, ErrorNotice, Paging, Skeleton, displayTime, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import flowStyles from "./cultivation-flow.module.css";
import * as c from "./records-contracts";
import { MaterialForm } from "./records-material-form";
import { materialRepo, useAllowed } from "./records-shared";

/** Material usage log of a raft, grouped by cultivation cycle. */
export function MaterialsPanel({ zoneId, raftId }: { zoneId: string; raftId: string }) {
  const allowed = useAllowed("material-usages", zoneId);
  const [selected, setSelected] = useState<z.infer<typeof c.materialRecord> | null>();
  const remote = useRemote(
    useMemo(
      () => (signal: AbortSignal) => materialRepo.read("list", { id: raftId, zoneId }, c.materialList, signal),
      [raftId, zoneId],
    ),
  );
  return (
    <section className={flowStyles.recordsPanel}>
      <ErrorNotice error={remote.error} />
      <div className={flowStyles.panelHeading}>
        <div>
          <h3>Nhật ký sử dụng vật tư</h3>
          <p>Nhóm theo chu kỳ; mỗi dòng là một vật tư đã ghi nhận.</p>
        </div>

      </div>
      {remote.loading ? (
        <Skeleton />
      ) : (
        remote.data && (
          <>
            {!remote.data.groups.length && (
              <p className={flowStyles.empty}>Chưa có ghi nhận sử dụng vật tư cho bè này.</p>
            )}
            {remote.data.groups.map((group, index) => (
              <MaterialGroup
                key={group.cycle?.id ?? index}
                group={group}
                zoneId={zoneId}
                canEdit={allowed("Edit")}
                onSelect={setSelected}
                editor={selected && <MaterialForm zoneId={zoneId} raftId={raftId} record={selected} allowed={allowed} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); remote.reload(); }} />}
                editingId={selected?.id}
              />
            ))}
          </>
        )
      )}
        <div className={flowStyles.actions}>
          <Button type="button" variant="secondary" disabled={remote.loading} onClick={remote.reload}>
            Tải lại
          </Button>
          {remote.data?.canRecord && allowed("Create") && (
            <Button type="button" onClick={() => setSelected(null)}>Ghi nhận vật tư</Button>
          )}
        </div>
      {selected === null && (
        <MaterialForm
          zoneId={zoneId}
          raftId={raftId}
          record={selected}
          allowed={allowed}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            remote.reload();
          }}
        />
      )}
    </section>
  );
}
/** One cycle group of material usage rows; each row expands into its detail. */
function MaterialGroup({
  group,
  zoneId,
  canEdit,
  onSelect,
  editor,
  editingId,
}: {
  group: z.infer<typeof c.materialList>["groups"][number];
  canEdit: boolean;
  zoneId: string;
  editor?: ReactNode;
  editingId?: string;
  onSelect(record: z.infer<typeof c.materialRecord>): void;
}) {
  const [page, setPage] = useState<number>();
  const query = useSearchParams();
  const [expanded, setExpanded] = useState<string | undefined>(() => query.get("recordId") ?? undefined);
  const rows = group.repairs.flatMap((repair) => repair.records);
  const linkedPage = Math.max(1, Math.ceil((rows.findIndex(v => v.id === query.get("recordId")) + 1) / 10));
  const current = Math.min(page ?? linkedPage, Math.max(1, Math.ceil(rows.length / 10)));
  return (
    <section className={flowStyles.materialGroup}>
      <div className={flowStyles.groupHeading}>
        <div>
          <h4>{group.cycle ? `Chu kỳ từ ${formatVietnameseDate(group.cycle.startDate)}` : "Ngoài chu kỳ nuôi"}</h4>
          <p>
            {group.repairs.length} công việc · {rows.length} dòng vật tư
          </p>
        </div>
        <span className={flowStyles.state}>{group.locked ? "Đã khóa" : "Theo dõi"}</span>
      </div>
      <DataTable
        responsive
        headings={["Ngày", "Vật tư", "Số lượng", "Nội dung sửa chữa", "Người ghi nhận"]}
        empty={!rows.length}
      >
        {rows.slice((current - 1) * 10, current * 10).map((row) => (
          <Fragment key={row.id}>
            <OpenableTableRow
              data-selected={expanded === row.id || undefined}
              onOpen={() => setExpanded((value) => (value === row.id ? undefined : row.id))}
            >
              <td data-label="Ngày" className="whitespace-nowrap">
                {formatVietnameseDate(row.usageDate)}
              </td>
              <td data-label="Vật tư">
                <button
                  type="button"
                  className={flowStyles.recordLink}
                  aria-label={`Chi tiết sử dụng ${row.itemCode} ngày ${formatVietnameseDate(row.usageDate)}`}
                  aria-expanded={expanded === row.id}
                  onClick={() => setExpanded((value) => (value === row.id ? undefined : row.id))}
                >
                  {row.itemCode}
                </button>
                <span className="block text-xs text-text-muted">{row.itemName}</span>
              </td>
              <td data-label="Số lượng" className="whitespace-nowrap text-right tabular-nums">
                {row.quantity.toLocaleString("vi-VN")} {row.unit}
              </td>
              <td data-label="Nội dung sửa chữa">{row.repairReason}</td>
              <td data-label="Người ghi nhận">{row.recordedByName ?? "—"}</td>
            </OpenableTableRow>
            {expanded === row.id && (
              <tr>
                <td colSpan={5} className={flowStyles.recordDetailCell}>
                  {editingId === row.id ? editor : <section className={flowStyles.recordDetail} aria-label="Chi tiết sử dụng vật tư">
                    <h4>
                      <Link href={farmingReferenceHref("inputItem", { code: row.itemCode })}>{row.itemCode} · {row.itemName}</Link>
                    </h4>
                    <dl>
                      <div>
                        <dt>Ngày sử dụng</dt>
                        <dd>{formatVietnameseDate(row.usageDate)}</dd>
                      </div>
                      <div>
                        <dt>Bè sử dụng</dt>
                        <dd><Link href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>{row.raftCode}</Link></dd>
                      </div>
                      <div>
                        <dt>Số lượng</dt>
                        <dd>
                          {row.quantity.toLocaleString("vi-VN")} {row.unit}
                        </dd>
                      </div>
                      <div>
                        <dt>Người ghi nhận</dt>
                        <dd>{row.recordedByName ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Thời điểm ghi nhận</dt>
                        <dd>{displayTime(row.recordedAt)}</dd>
                      </div>
                      <div>
                        <dt>Nội dung sửa chữa / bảo dưỡng</dt>
                        <dd>{row.repairReason}</dd>
                      </div>
                    </dl>
                    {!row.canEdit && <p>Bản ghi này hiện chỉ được xem.</p>}
                    <footer>
                      {canEdit && row.canEdit && (
                        <Button type="button" className="w-auto" onClick={() => onSelect(row)}>
                          Chỉnh sửa ghi nhận
                        </Button>
                      )}
                      <Button type="button" className="w-auto" variant="secondary" onClick={() => setExpanded(undefined)}>
                        Thu gọn
                      </Button>
                    </footer>
                  </section>}
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </DataTable>
      <div className={flowStyles.tablePaging}>
        <Paging page={current} total={rows.length} pageSize={10} onChange={setPage} />
      </div>
    </section>
  );
}
