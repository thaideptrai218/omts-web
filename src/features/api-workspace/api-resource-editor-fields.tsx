"use client";
import { SelectBox } from "@/components/ui/select-box";
import type { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/form/form-field";
import { inputClass, text } from "./api-resource-presentation";
import { resources, type ResourceKey } from "./resources";
import type { ApiRecord } from "./workspace-repository";

/**
 * Definition-driven form fields, plus employee working zones / bank account and the raft lane count.
 * Choosing the "Seed" item group also applies the proposed seed unit when one is known.
 */
export function ResourceEditorFields({
  resource,
  record,
  values,
  setValues,
  lockedField,
  seedUnit,
  zones,
  workingZoneIds,
  setWorkingZoneIds,
  bank,
  setBank,
  laneCount,
  setLaneCount,
}: {
  resource: ResourceKey;
  record: ApiRecord | null;
  values: Record<string, string>;
  setValues: Dispatch<SetStateAction<Record<string, string>>>;
  lockedField(key: string): boolean;
  seedUnit: string | null | undefined;
  zones: ApiRecord[];
  workingZoneIds: string[];
  setWorkingZoneIds: Dispatch<SetStateAction<string[]>>;
  bank: Record<string, string>;
  setBank: Dispatch<SetStateAction<Record<string, string>>>;
  laneCount: string;
  setLaneCount(value: string): void;
}) {
  const definition = resources[resource];
  return (
    <>
      {definition.fields.map((field) =>
        field.type === "select" ? (
          <label key={field.key} className="text-sm font-semibold">
            {field.label}
            <SelectBox
              required={field.required}
              className={inputClass}
              value={values[field.key]}
              disabled={lockedField(field.key)}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                  ...(field.key === "group" && event.target.value === "Seed" && seedUnit ? { unit: seedUnit } : {}),
                }))
              }
            >
              <option value="">Chọn</option>
              {field.options?.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectBox>
          </label>
        ) : field.type === "textarea" ? (
          <label key={field.key} className="text-sm font-semibold sm:col-span-2">
            {field.label}
            <textarea
              className={inputClass}
              rows={3}
              value={values[field.key]}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
            />
          </label>
        ) : (
          <FormField
            key={field.key}
            id={`api-${field.key}`}
            label={field.label}
            type={field.type === "number" || field.type === "date" ? field.type : "text"}
            disabled={lockedField(field.key)}
            required={
              field.required ||
              (resource === "customers" && field.key === "phoneNumber" && record?.phoneLocked !== true)
            }
            step={field.type === "number" ? "any" : undefined}
            value={values[field.key]}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        ),
      )}
      {resource === "employees" && (
        <>
          <fieldset className="rounded-control border border-border p-4 sm:col-span-2">
            <legend>Vùng làm việc</legend>
            {zones.map((zone) => (
              <label className="mr-4 inline-flex items-center gap-2 py-2" key={zone.id}>
                <input
                  type="checkbox"
                  checked={workingZoneIds.includes(zone.id)}
                  onChange={(event) =>
                    setWorkingZoneIds((current) =>
                      event.target.checked ? [...current, zone.id] : current.filter((value) => value !== zone.id),
                    )
                  }
                />
                {text(zone.name)}
              </label>
            ))}
          </fieldset>
          {[
            ["bankName", "Ngân hàng"],
            ["accountNumber", "Số tài khoản"],
            ["accountHolderName", "Chủ tài khoản"],
          ].map(([key, label]) => (
            <FormField
              key={key}
              id={`api-${key}`}
              label={label}
              value={bank[key] ?? ""}
              onChange={(event) => setBank((current) => ({ ...current, [key]: event.target.value }))}
            />
          ))}
        </>
      )}
      {resource === "rafts" && (
        <div className="sm:col-span-2">
          <FormField
            id="api-lane-count"
            label="Số làn đang dùng"
            type="number"
            min="1"
            step="1"
            required
            value={laneCount}
            onChange={(event) => setLaneCount(event.target.value)}
          />
        </div>
      )}
    </>
  );
}
