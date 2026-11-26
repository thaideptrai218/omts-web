import type { LotTrace } from "./contracts";
import s from "./lot-tracing.module.css";

type Tone = "ok" | "warn" | "bad";
type Link = { key: string; title: string; tone: Tone; note: string; target: string };

const toneLabel: Record<Tone, string> = { ok: "Đủ", warn: "Thiếu", bad: "Lỗi" };
const toneClass: Record<Tone, string> = { ok: s.chainOk, warn: s.chainWarn, bad: s.chainBad };

/** Trạng thái từng mắt xích từ dữ liệu trace đã có: xanh = đủ, vàng = thiếu (chưa có hoặc bị ẩn theo quyền), đỏ = lỗi cần xử lý. Chỉ đọc, không đổi gì. */
export function chainLinks(trace: LotTrace): Link[] {
  const seeded = trace.lanes.filter((lane) => lane.seedings.length > 0).length;
  const seedTone: Tone = trace.missing.length === 0 ? "ok" : seeded === 0 ? "bad" : "warn";
  const hiddenCustomer = trace.invoices.some((inv) => !inv.walkIn && !inv.customerName);
  const claims = trace.openClaims ?? [];
  const plan = trace.harvestPlan;
  return [
    { key: "seed", title: "Lô giống", tone: seedTone, target: "trace-backward", note: seedTone === "ok" ? `${trace.lanes.length} làn có lô giống` : `${trace.missing.length} chỗ thiếu dữ liệu` },
    { key: "raft", title: "Bè / Chu kỳ", tone: "ok", target: "trace-backward", note: `Bè ${trace.raftCode}` },
    { key: "harvest", title: "Thu hoạch", tone: plan ? "ok" : "warn", target: "trace-lot", note: plan ? `KH ${plan.code}${plan.orders.length ? ` · ${plan.orders.map((o) => o.code).join(", ")}` : ""}` : "Không theo kế hoạch" },
    { key: "weigh", title: "Cân tại cảng", tone: trace.weighedKg != null ? "ok" : "warn", target: "trace-lot", note: trace.weighedKg != null ? "Đã cân" : "Chưa cân, chỉ có kg ước tính" },
    { key: "invoice", title: "Hóa đơn", tone: claims.length > 0 ? "bad" : trace.invoices.length > 0 ? "ok" : "warn", target: "trace-forward", note: claims.length > 0 ? `${claims.length} khiếu nại đang mở` : trace.invoices.length > 0 ? `${trace.invoices.length} hóa đơn` : "Chưa bán" },
    { key: "customer", title: "Khách", tone: trace.invoices.length === 0 || hiddenCustomer ? "warn" : "ok", target: "trace-forward", note: trace.invoices.length === 0 ? "Chưa có khách" : hiddenCustomer ? "Ẩn theo quyền xem hóa đơn" : "Đã xác định" },
  ];
}

/** Sơ đồ chuỗi đầu trang: Lô giống → Bè/Chu kỳ → Thu hoạch → Cân tại cảng → Hóa đơn → Khách. Bấm một mắt xích để cuộn tới khối chứa nó. */
export function TraceChainDiagram({ trace }: { trace: LotTrace }) {
  const goTo = (target: string) => document.getElementById(target)?.scrollIntoView?.({ block: "start" });
  return (
    <section className={s.card} aria-labelledby="chain-title">
      <div className={s.cardHead}><h2 id="chain-title">Chuỗi truy xuất</h2><span className={s.muted}>Lô giống → Bè/Chu kỳ → Thu hoạch → Cân tại cảng → Hóa đơn → Khách</span></div>
      <ol className={s.chain}>
        {chainLinks(trace).map((link) => (
          <li key={link.key}>
            <button type="button" className={`${s.chainLink} ${toneClass[link.tone]}`} onClick={() => goTo(link.target)} aria-label={`${link.title}: ${toneLabel[link.tone]}. ${link.note}. Cuộn tới khối chi tiết`}>
              <strong>{link.title}</strong><span data-state={link.tone}>{toneLabel[link.tone]}</span><span>{link.note}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
