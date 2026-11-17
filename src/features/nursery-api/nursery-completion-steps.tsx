export type NurseryCompletionStep = "result" | "review";

export function NurseryCompletionSteps({ step, complete }: { step: NurseryCompletionStep; complete: boolean }) {
  const labels = [complete ? "Kết quả ươm" : "Điều chỉnh", "Xem lại"];
  const current = step === "result" ? 0 : 1;
  return <nav aria-label="Các bước hoàn tất ươm" className="mb-4">
    <p role="status" className="mb-2 text-sm font-semibold">Bước {current + 1}/2 · {labels[current]}</p>
    <ol className="grid grid-cols-2 gap-2 text-xs">{labels.map((label, index) => <li key={label} aria-current={index === current ? "step" : undefined}
      className={`min-w-0 break-words border-t-2 pt-2 ${index === current ? "border-primary font-semibold text-primary" : "border-border text-text-muted"}`}>
      {index + 1}. {label}
    </li>)}</ol>
  </nav>;
}
