export type NurseryCompletionStep = "result" | "transfer" | "edit" | "review";
const completeSteps = ["Kết quả ươm", "Chuyển sang bè", "Xem lại"];
const editSteps = ["Điều chỉnh", "Xem lại"];

export function NurseryCompletionSteps({ step, complete, zero }: { step: NurseryCompletionStep; complete: boolean; zero: boolean }) {
  const labels = complete ? completeSteps : editSteps;
  const current = complete ? step === "result" ? 0 : step === "transfer" ? 1 : 2 : step === "review" ? 1 : 0;
  return <nav aria-label="Các bước hoàn tất ươm" className="mb-4">
    <p role="status" className="mb-2 text-sm font-semibold">Bước {current + 1}/{labels.length} · {labels[current]}</p>
    <ol className={`grid ${complete ? "grid-cols-3" : "grid-cols-2"} gap-2 text-xs`}>{labels.map((label, index) => <li key={label} aria-current={index === current ? "step" : undefined}
      className={`min-w-0 break-words border-t-2 pt-2 ${index === current ? "border-primary font-semibold text-primary" : "border-border text-text-muted"}`}>
      {index + 1}. {label}{complete && zero && index === 1 ? " (bỏ qua)" : ""}
    </li>)}</ol>
  </nav>;
}
