"use client";
import { text } from "./api-resource-presentation";
import { resources, type ResourceKey } from "./resources";
import type { ApiRecord } from "./workspace-repository";

/** Read-only column values, lanes and permissions of a saved record (zones, rafts, employees). */
export function ResourceEditorRecordSummary({ resource, record }: { resource: ResourceKey; record: ApiRecord }) {
  const definition = resources[resource];
  return (
    <div className="mt-5 rounded-control border border-border p-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        {definition.columns.map(([key, label]) => (
          <div key={key}>
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd>
              {/* Rafts without a stored lane count show the number of lanes instead. */}
              {text(
                resource === "rafts" && key === "laneCount" && record[key] == null && Array.isArray(record.lanes)
                  ? record.lanes.length
                  : record[key],
              )}
            </dd>
          </div>
        ))}

        {resource === "employees" && (
          <div>
            <dt className="text-sm text-text-muted">Tài khoản đăng nhập</dt>
            <dd>
              {record.account && typeof record.account === "object" && "username" in record.account
                ? String(record.account.username)
                : "Chưa liên kết"}
            </dd>
          </div>
        )}
      </dl>
      {Array.isArray(record.lanes) && (
        <ul className="mt-3">
          {record.lanes.map((lane) => (
            <li key={lane.laneNumber}>
              Làn {lane.laneNumber}: {lane.statusId === 101 ? "Đang dùng" : "Đã ngừng"}
            </li>
          ))}
        </ul>
      )}
      {Array.isArray(record.permissions) && (
        <ul className="mt-3 space-y-2">
          {record.permissions.map((permission) => (
            <li key={permission.functionCode}>
              {permission.functionCode}: {permission.actions?.join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
