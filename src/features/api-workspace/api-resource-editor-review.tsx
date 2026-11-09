"use client";
import type { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import { text } from "./api-resource-presentation";
import { resources, type ResourceKey } from "./resources";
import type { ApiRecord } from "./workspace-repository";

/** Lists every editable field of a record (duplicate or latest server copy) for comparison. */
function FieldValues({
  resource,
  record,
  itemClassName,
}: {
  resource: ResourceKey;
  record: ApiRecord;
  itemClassName?: string;
}) {
  return (
    <dl>
      {resources[resource].fields.map((field) => (
        <div key={field.key} className={itemClassName}>
          <dt className={itemClassName ? "text-sm text-text-muted" : undefined}>{field.label}</dt>
          <dd>{text(record[field.key])}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shown when the server reports a duplicate catalogue entry; lets the user load and inspect it. */
export function DuplicateRecordReview({
  resource,
  pending,
  duplicate,
  onLoad,
}: {
  resource: ResourceKey;
  pending: boolean;
  duplicate: ApiRecord | undefined;
  onLoad(): void;
}) {
  return (
    <section className="my-4 space-y-3">
      <Button variant="secondary" disabled={pending} onClick={onLoad}>
        Xem bản ghi trùng
      </Button>
      {duplicate && <FieldValues resource={resource} record={duplicate} />}
    </section>
  );
}

/** Shown after a conflicting or uncertain save: load the server copy and optionally replace the draft. */
export function LatestRecordReview({
  resource,
  pending,
  latest,
  confirmation,
  onLoad,
  onUseLatest,
}: {
  resource: ResourceKey;
  pending: boolean;
  latest: ApiRecord | undefined;
  confirmation: ReturnType<typeof useActionDialog>;
  onLoad(): void;
  onUseLatest(latest: ApiRecord): void;
}) {
  return (
    <div className="mt-4 rounded-control border border-border p-4">
      <Button className="w-auto" variant="secondary" isPending={pending} onClick={onLoad}>
        Tải dữ liệu mới để đối chiếu
      </Button>
      {latest && (
        <div className="mt-4">
          <p className="font-semibold">Dữ liệu hiện tại trên hệ thống</p>
          <FieldValues resource={resource} record={latest} itemClassName="mt-2" />
          <Button
            className="mt-4 w-auto"
            variant="secondary"
            onClick={async () => {
              if (await confirmation.confirm("Dùng dữ liệu mới và bỏ bản nháp đang mở?")) onUseLatest(latest);
            }}
          >
            Dùng dữ liệu mới
          </Button>
        </div>
      )}
    </div>
  );
}
