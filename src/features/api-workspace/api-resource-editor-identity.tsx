"use client";
import { StatusPill } from "@/components/ui/management-page";
import { knownRoleNameLabel } from "@/shared/presentation/actor-label";
import { text } from "./api-resource-presentation";
import catalogStyles from "./catalog.module.css";
import { resources, type ResourceKey } from "./resources";
import type { ApiRecord } from "./workspace-repository";

/** Identity header of the resource editor (catalogue, account/role or customer) plus customer facts. */
export function ResourceEditorIdentity({ resource, record }: { resource: ResourceKey; record: ApiRecord | null }) {
  const definition = resources[resource];
  return (
    <>
      {(resource === "suppliers" || resource === "input-items") && (
        <div className={catalogStyles.identity}>
          <div>
            <p>{resource === "suppliers" ? "Thông tin đối tác" : "Thông tin vật tư"}</p>
            <h2>{record ? text(record.name) : resource === "suppliers" ? "Nhà cung cấp mới" : "Vật tư mới"}</h2>
            {typeof record?.code === "string" && <span>{record.code}</span>}
          </div>
          {record && (
            <StatusPill tone={record.statusId === 101 ? "success" : "neutral"}>
              {record.statusId === 101 ? "Đang dùng" : "Ngừng dùng"}
            </StatusPill>
          )}
        </div>
      )}
      {(resource === "accounts" || resource === "roles") && (
        <div className={catalogStyles.identity}>
          <div>
            <p>{resource === "accounts" ? "Nhân viên nội bộ" : "Thông tin vai trò"}</p>
            <h2>
              {record
                ? resource === "roles"
                  ? knownRoleNameLabel(String(record.name ?? ""))
                  : text(record.displayName ?? record.username)
                : definition.title}
            </h2>
            {record && <span>{text(resource === "accounts" ? record.username : record.code)}</span>}
          </div>
          {resource === "accounts" && record && (
            <StatusPill tone={record.status === "Active" ? "success" : "neutral"}>
              {record.status === "Locked" ? "Đã khóa" : "Hoạt động"}
            </StatusPill>
          )}
        </div>
      )}
      {resource === "customers" && (
        <div className={catalogStyles.identity}>
          <div>
            <p>Hồ sơ khách hàng</p>
            <h2>{record ? text(record.name) : "Khách hàng mới"}</h2>
          </div>
          {record && (
            <StatusPill tone={record.traderAccount ? "success" : "neutral"}>
              {record.traderAccount ? "Đã liên kết thương lái" : "Chưa liên kết thương lái"}
            </StatusPill>
          )}
        </div>
      )}
      {resource === "customers" && record && (
        <dl className={catalogStyles.profileFacts}>
          <div>
            <dt>Công nợ hiện tại</dt>
            <dd className={catalogStyles.amount}>
              {typeof record.currentDebt === "number" ? `${record.currentDebt.toLocaleString("vi-VN")} ₫` : "—"}
            </dd>
          </div>
          <div>
            <dt>Tài khoản thương lái</dt>
            <dd>
              {record.traderAccount && typeof record.traderAccount === "object" && "displayName" in record.traderAccount
                ? text(record.traderAccount.displayName)
                : "Chưa liên kết"}
            </dd>
          </div>
          {typeof record.email === "string" && record.email && (
            <div>
              <dt>Email</dt>
              <dd>{record.email}</dd>
            </div>
          )}
        </dl>
      )}
    </>
  );
}
