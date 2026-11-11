"use client";
import { Fragment } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataGrid } from "@/components/ui/data-grid";
import { StatusPill } from "@/components/ui/management-page";
import { directoryActions, resourceValueLabel, text } from "./api-resource-presentation";
import catalogStyles from "./catalog.module.css";
import { resources, type ResourceKey } from "./resources";
import type { ApiRecord } from "./workspace-repository";

type ResourceDefinition = (typeof resources)[ResourceKey];

/** Card grid used for zones and rafts; the whole card is a button that opens the record. */
export function ResourceGridCards({
  resource,
  definition,
  items,
  opening,
  onOpen,
}: {
  resource: ResourceKey;
  definition: ResourceDefinition;
  items: ApiRecord[] | undefined;
  opening: boolean;
  onOpen(row: ApiRecord): void;
}) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items?.length ? (
        items.map((row) => (
          <article
            key={row.id}
            className="relative min-w-0 rounded-card border border-border bg-surface p-4 transition hover:border-primary/50 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="break-words font-semibold">{text(row.name ?? row.code)}</h2>
              <StatusPill tone={Number(row.statusId) === 101 ? "success" : "neutral"}>
                {resourceValueLabel(resource, "status", row)}
              </StatusPill>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              {definition.columns
                .filter(([key]) => key !== "status" && (key !== "name" || resource !== "zones"))
                .map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="text-right font-medium">{resourceValueLabel(resource, key, row)}</dd>
                  </div>
                ))}
            </dl>
            <button
              type="button"
              className="absolute inset-0 rounded-card focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait"
              aria-label={`Xem ${text(row.name ?? row.code)}`}
              disabled={opening}
              onClick={() => onOpen(row)}
            >
              <span className="sr-only">Mở hồ sơ</span>
            </button>
          </article>
        ))
      ) : (
        <p className="rounded-card border border-border p-5 text-text-muted md:col-span-2 xl:col-span-3">
          Không có bản ghi phù hợp bộ lọc.
        </p>
      )}
    </div>
  );
}

/** Table view; every row opens the record editor. */
export function ResourceTable({
  resource,
  definition,
  items,
  opening,
  usesFilterRail,
  onOpen,
}: {
  resource: ResourceKey;
  definition: ResourceDefinition;
  items: ApiRecord[] | undefined;
  opening: boolean;
  usesFilterRail: boolean;
  onOpen(row: ApiRecord): void;
}) {
  const isCatalog = resource === "input-items";
  const customerDirectory = resource === "customers";
  const actions = directoryActions[resource];

  return (
    <div className="mt-4">
      <DataGrid responsive headings={[...definition.columns.map(([, label]) => label), "Hồ sơ"]} empty={!items?.length}>
        {items?.map((row) => (
          <Fragment key={row.id}>
            <OpenableTableRow disabled={opening} onOpen={() => onOpen(row)}>
              {definition.columns.map(([key, label]) => (
                <td
                  key={key}
                  data-label={label}
                  className={
                    key === "code" || key === "username"
                      ? "font-mono tabular-nums"
                      : usesFilterRail && key === "name"
                        ? catalogStyles.name
                        : ""
                  }
                >
                  {key === "status" ? (
                    <StatusPill
                      tone={
                        [101, 301].includes(Number(row.statusId)) || row.status === "Active" ? "success" : "neutral"
                      }
                    >
                      {resourceValueLabel(resource, key, row)}
                    </StatusPill>
                  ) : customerDirectory && key === "hasTraderAccount" ? (
                    <StatusPill tone={row.hasTraderAccount === true ? "success" : "neutral"}>
                      {row.hasTraderAccount === true ? "Đã liên kết" : "Chưa liên kết"}
                    </StatusPill>
                  ) : (
                    resourceValueLabel(resource, key, row)
                  )}
                </td>
              ))}
              <td data-label="Hồ sơ">
                <button
                  className="font-semibold text-primary underline underline-offset-4 hover:text-primary-hover"
                  aria-label={isCatalog ? `Xem hồ sơ ${text(row.name ?? row.code)}` : undefined}
                  disabled={opening}
                  onClick={() => onOpen(row)}
                >
                  {isCatalog ? "Xem chi tiết" : (actions?.open ?? "Mở hồ sơ")}
                </button>
              </td>
            </OpenableTableRow>
          </Fragment>
        ))}
      </DataGrid>
    </div>
  );
}
