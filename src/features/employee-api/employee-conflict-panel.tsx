"use client";
import { Button } from "@/components/ui/button";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import type { createOperationsRepository } from "@/features/operations/repository";
import type { useMutation } from "@/features/operations/ui";
import { employeePageSchema, employeeViewSchema, type Employee } from "./contracts";
import { ProfileComparison } from "./employee-profile-comparison";

/**
 * Shown while a save is blocked: the draft is kept. Existing profiles reload their server copy;
 * new profiles search by the typed name so the user can compare possible duplicates.
 */
export function EmployeeConflictPanel({
  repository,
  mutation,
  baseline,
  searchName,
  latest,
  reconciledRows,
  onLatestLoaded,
  onRowsLoaded,
  onCompared,
  onKeepDraft,
  onAdopt,
}: {
  repository: ReturnType<typeof createOperationsRepository>;
  mutation: ReturnType<typeof useMutation>;
  baseline: Employee | null;
  searchName: string;
  latest: Employee | undefined;
  reconciledRows: EmployeeListItemDto[] | undefined;
  onLatestLoaded(employee: Employee): void;
  onRowsLoaded(rows: EmployeeListItemDto[]): void;
  onCompared(employee: Employee): void;
  onKeepDraft(latest: Employee): void;
  onAdopt(employee: Employee): void;
}) {
  async function loadForComparison() {
    if (baseline) {
      const next = await mutation.run(() => repository.read("detail", { id: baseline.id }, employeeViewSchema), true);
      if (next) onLatestLoaded(next);
    } else {
      const next = await mutation.run(
        () => repository.read("list", { search: searchName, page: "1", pageSize: "100" }, employeePageSchema),
        true,
      );
      if (next) onRowsLoaded(next.items);
    }
  }

  return (
    <div className="my-4 rounded-control border border-border p-4">
      <p>Bản nháp vẫn được giữ; chưa gửi lại thao tác.</p>
      <Button className="mt-3 w-auto" variant="secondary" isPending={mutation.pending} onClick={loadForComparison}>
        Tải hồ sơ mới để đối chiếu
      </Button>
      {latest && (
        <div className="mt-3">
          <ProfileComparison employee={latest} />
          <div className="mt-3 flex flex-wrap gap-3">
            {!mutation.uncertain && (
              <Button className="w-auto" variant="secondary" onClick={() => onKeepDraft(latest)}>
                Đã đối chiếu, giữ bản nháp để sửa tiếp
              </Button>
            )}
            <Button className="w-auto" variant="secondary" onClick={() => onAdopt(latest)}>
              Dùng dữ liệu đã lưu
            </Button>
          </div>
        </div>
      )}
      {reconciledRows && (
        <ul className="mt-3 space-y-3">
          {reconciledRows.map((row) => (
            <li key={row.id}>
              {row.fullName} · {row.phoneNumber}{" "}
              <button
                type="button"
                className="text-primary underline"
                disabled={mutation.pending}
                onClick={async () => {
                  const next = await mutation.run(
                    () => repository.read("detail", { id: row.id }, employeeViewSchema),
                    true,
                  );
                  if (next) onCompared(next);
                }}
              >
                Đối chiếu {row.fullName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
