"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import type {
  FarmingZone,
  ZoneMutationResult,
  ZoneValues,
} from "../domain/farming-zone";
import { farmingZoneSchema } from "../schemas/farming-zone-schema";
import type { FarmingZoneService } from "../services/farming-zone-service";
import { useZoneMutation } from "./use-zone-mutation";
import { ZoneField, zoneInputStyles } from "./zone-field";

const fields: readonly {
  key: keyof ZoneValues;
  label: string;
  hint?: string;
}[] = [
  { key: "code", label: "Mã vùng" },
  { key: "name", label: "Tên vùng" },
  { key: "location", label: "Vị trí" },
  { key: "waterMeasurementPoint", label: "Điểm đo nước đại diện" },
  { key: "latitude", label: "Vĩ độ", hint: "Từ −90 đến 90" },
  { key: "longitude", label: "Kinh độ", hint: "Từ −180 đến 180" },
  { key: "area", label: "Diện tích (ha)" },
];
export function zoneFormValues(zone?: FarmingZone): ZoneValues {
  return {
    code: zone?.code ?? "",
    name: zone?.name ?? "",
    location: zone?.location ?? "",
    waterMeasurementPoint: zone?.waterMeasurementPoint ?? "",
    latitude: zone ? String(zone.latitude) : "",
    longitude: zone ? String(zone.longitude) : "",
    area: zone ? String(zone.area) : "",
  };
}
export function ZoneEditor({
  zone,
  service,
  onSaved,
  onStateChange,
}: {
  zone?: FarmingZone;
  service: FarmingZoneService;
  onSaved(result: Extract<ZoneMutationResult, { status: "saved" }>): void;
  onStateChange(dirty: boolean, pending: boolean): void;
}) {
  const form = useForm<ZoneValues>({
    defaultValues: zoneFormValues(zone),
    resolver: zodResolver(farmingZoneSchema),
  });
  const revision = useRef(0);
  const wasPending = useRef(false);
  const mutation = useZoneMutation(
    (result) => {
      form.reset(
        zoneFormValues(
          result.workspace.zones.find((item) => item.id === result.savedId),
        ),
      );
      onSaved(result);
    },
    (pending) => onStateChange(form.formState.isDirty, pending),
    (result) => {
      if (result.status === "duplicate")
        form.setError("code", {
          message: "Mã vùng đã được sử dụng. Hãy nhập mã khác.",
        });
    },
  );
  const { isDirty } = form.formState;
  useEffect(
    () => onStateChange(isDirty, mutation.pending),
    [isDirty, mutation.pending, onStateChange],
  );
  useEffect(() => {
    if (wasPending.current && !mutation.pending)
      form.setFocus(form.formState.errors.code ? "code" : "name");
    wasPending.current = mutation.pending;
  }, [form, mutation.pending]);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        const submittedRevision = revision.current;
        void form.handleSubmit((values) => {
          if (revision.current !== submittedRevision) return;
          return mutation.run(() =>
            service.save({
              ...values,
              id: zone?.id ?? null,
              recordVersion: zone?.recordVersion ?? null,
            }),
          );
        })(event);
      }}
    >
      <fieldset
        disabled={mutation.pending}
        className="grid min-w-0 gap-4 sm:grid-cols-2"
      >
        <legend className="sr-only">Thông tin vùng nuôi</legend>
        {fields.map(({ key, label, hint }) => (
          <ZoneField
            key={key}
            label={label}
            required
            error={form.formState.errors[key]?.message}
          >
            {(props) => (
              <input
                {...props}
                {...form.register(key)}
                className={zoneInputStyles}
                inputMode={
                  ["latitude", "longitude", "area"].includes(key)
                    ? "decimal"
                    : undefined
                }
                placeholder={hint}
              />
            )}
          </ZoneField>
        ))}
      </fieldset>
      {mutation.error && (
        <p
          className="mt-4 rounded-control bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {mutation.error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="submit"
          className="sm:w-auto"
          isPending={mutation.pending}
        >
          {zone ? "Lưu thông tin vùng" : "Tạo vùng nuôi"}
        </Button>
        {isDirty && (
          <Button
            className="sm:w-auto"
            disabled={mutation.pending}
            variant="secondary"
            onClick={() => {
              revision.current += 1;
              mutation.clearError();
              form.reset(zoneFormValues(zone));
            }}
          >
            Hủy thay đổi
          </Button>
        )}
      </div>
      {!zone && (
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Sau khi tạo vùng, bạn có thể thêm giấy phép và các giấy tờ liên quan
          vào hồ sơ.
        </p>
      )}
    </form>
  );
}
