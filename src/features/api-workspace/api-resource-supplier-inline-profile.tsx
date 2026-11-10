"use client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { ResourceExtras } from "@/features/farming-api/resource-extras";
import { useRemote } from "@/features/operations/ui";
import { itemGroupLabels, text } from "./api-resource-presentation";
import catalogStyles from "./catalog.module.css";
import { createWorkspaceRepository, type ApiRecord } from "./workspace-repository";

/** Supplier profile shown inline under its list row, with extras and an edit entry point. */
export function SupplierInlineProfile({
  id,
  canEdit,
  onEdit,
  onSaved,
}: {
  id: string;
  canEdit: boolean;
  onEdit(record: ApiRecord): void;
  onSaved(): void;
}) {
  const repository = useMemo(() => createWorkspaceRepository("suppliers"), []);
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => repository.detail(id, signal), [repository, id]));
  return (
    <section className={catalogStyles.expanded} aria-label="Chi tiết nhà cung cấp" aria-busy={remote.loading}>
      {remote.loading && <p role="status">Đang tải hồ sơ nhà cung cấp…</p>}
      {remote.error && (
        <div role="alert">
          <p>{remote.error}</p>
          <Button variant="secondary" onClick={remote.reload}>
            Tải lại hồ sơ
          </Button>
        </div>
      )}
      {remote.data && (
        <>
          <header>
            <h3>{text(remote.data.name)}</h3>
            <StatusPill tone={remote.data.statusId === 101 ? "success" : "neutral"}>
              {remote.data.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}
            </StatusPill>
          </header>
          <dl className={catalogStyles.supplierFacts}>
            {[
              ["Loại nhà cung cấp", itemGroupLabels[String(remote.data.supplierType)]],
              ["Số điện thoại", remote.data.phoneNumber],
              ["Địa chỉ", remote.data.address],
              ["Email", remote.data.email],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{String(label)}</dt>
                <dd>{text(value)}</dd>
              </div>
            ))}
          </dl>
          <ResourceExtras
            resource="suppliers"
            record={remote.data}
            busy={false}
            dirty={false}
            blocked={false}
            onSaved={onSaved}
          />
          {canEdit && (
            <footer>
              <Button className="w-auto" onClick={() => onEdit(remote.data!)}>
                {remote.data.statusId === 102 ? "Mở hồ sơ / sử dụng lại" : "Sửa hồ sơ"}
              </Button>
            </footer>
          )}
        </>
      )}
    </section>
  );
}
