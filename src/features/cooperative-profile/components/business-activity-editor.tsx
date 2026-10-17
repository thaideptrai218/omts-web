export type BusinessActivityRow = Readonly<{
  id: string;
  value: string;
}>;

type BusinessActivityEditorProps = Readonly<{
  error?: string;
  onAdd(): void;
  onChange(id: string, value: string): void;
  onRemove(id: string): void;
  rows: readonly BusinessActivityRow[];
}>;

export function BusinessActivityEditor({
  error,
  onAdd,
  onChange,
  onRemove,
  rows,
}: BusinessActivityEditorProps) {
  return (
    <fieldset
      aria-describedby={error ? "business-activities-error" : undefined}
      className="min-w-0"
    >
      <legend className="text-sm font-semibold text-text">
        Ngành, nghề kinh doanh đã đăng ký
        <span aria-hidden="true" className="ml-1 text-danger">
          *
        </span>
      </legend>
      <p className="mt-1 text-sm leading-5 text-text-muted">
        Thêm từng ngành nghề đúng như hồ sơ đăng ký của hợp tác xã.
      </p>

      <div className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <div className="flex items-start gap-2" key={row.id}>
            <label className="sr-only" htmlFor={`business-activity-${row.id}`}>
              Ngành nghề số {index + 1}
            </label>
            <span
              aria-hidden="true"
              className="mt-3 grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-hover"
            >
              {index + 1}
            </span>
            <input
              aria-invalid={error ? true : undefined}
              className={`min-h-12 min-w-0 flex-1 rounded-control border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm outline-none transition placeholder:text-slate-400 ${
                error
                  ? "border-danger focus-visible:border-danger"
                  : "border-border-strong hover:border-slate-500 focus-visible:border-primary"
              }`}
              id={`business-activity-${row.id}`}
              maxLength={255}
              onChange={(event) => onChange(row.id, event.target.value)}
              placeholder="Ví dụ: Nuôi trồng thủy sản biển"
              value={row.value}
            />
            <button
              aria-label={`Xóa ngành nghề số ${index + 1}`}
              className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-control border border-border text-xl text-text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              disabled={rows.length === 1}
              onClick={() => onRemove(row.id)}
              title={rows.length === 1 ? "Cần ít nhất một ngành nghề" : "Xóa dòng"}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm font-medium text-danger" id="business-activities-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-primary transition hover:bg-primary-soft"
        onClick={onAdd}
        type="button"
      >
        <span aria-hidden="true" className="text-lg">+</span>
        Thêm ngành nghề
      </button>
    </fieldset>
  );
}
