import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import type { raftSchema } from "../schemas/raft-schema";
import { RaftField, raftInputStyles } from "./raft-field";
export type RaftFormValues = z.infer<typeof raftSchema>;

export function RaftLaneEditor({
  form,
  locked,
}: {
  form: UseFormReturn<RaftFormValues>;
  locked: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lanes",
  });
  return (
    <section
      className="mt-6 border-t border-border pt-5"
      aria-label="Thiết lập làn nuôi"
    >
      <h3 className="text-lg font-semibold">Bố trí làn nuôi</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Mỗi làn được đo từ mốc A đến mốc B. Chiều dài tính bằng mét, tối đa 2
        chữ số thập phân.
      </p>
      {locked && (
        <p
          className="mt-3 rounded-control bg-warning/10 p-3 text-sm leading-6"
          role="status"
        >
          Bè đang có chu kỳ nuôi mở nên sơ đồ được giữ nguyên. Bạn vẫn có thể
          sửa thông tin chung.
        </p>
      )}
      <fieldset disabled={locked} className="mt-4 min-w-0 space-y-3">
        <legend className="sr-only">Các làn từ mốc A đến mốc B</legend>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid min-w-0 gap-3 rounded-control border border-border bg-surface-subtle p-4 sm:grid-cols-[3rem_1fr_1fr_1fr]"
          >
            <span className="self-center text-sm font-semibold">
              Làn {index + 1}
            </span>
            <RaftField
              label={`Chiều dài làn ${index + 1} (m)`}
              required
              error={form.formState.errors.lanes?.[index]?.length?.message}
            >
              {(props) => (
                <input
                  {...props}
                  className={raftInputStyles}
                  inputMode="decimal"
                  {...form.register(`lanes.${index}.length`, {
                    setValueAs: (value: string | number) =>
                      typeof value === "number"
                        ? value
                        : value.trim() === ""
                          ? NaN
                          : Number(value.replace(",", ".")),
                  })}
                />
              )}
            </RaftField>
            {(["markerA", "markerB"] as const).map((key) => (
              <RaftField
                key={key}
                label={`Mốc ${key === "markerA" ? "A" : "B"} làn ${index + 1}`}
                required
                error={form.formState.errors.lanes?.[index]?.[key]?.message}
              >
                {(props) => (
                  <input
                    {...props}
                    className={raftInputStyles}
                    {...form.register(`lanes.${index}.${key}`)}
                  />
                )}
              </RaftField>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            className="sm:w-auto"
            onClick={() =>
              append({
                number: fields.length + 1,
                length: 0,
                markerA: "",
                markerB: "",
              })
            }
          >
            Thêm làn
          </Button>
          {fields.length > 1 && (
            <Button
              variant="secondary"
              className="sm:w-auto"
              onClick={() => remove(fields.length - 1)}
            >
              Bỏ làn cuối
            </Button>
          )}
        </div>
      </fieldset>
      {form.formState.errors.lanes?.root?.message && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {form.formState.errors.lanes.root.message}
        </p>
      )}
    </section>
  );
}
