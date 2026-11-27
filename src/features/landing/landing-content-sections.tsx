import { JourneyLine } from "@/features/public-site/journey-line";
import site from "@/features/public-site/public-site.module.css";
import { hiddenOnTrace, journey, scanSteps, shownOnTrace } from "./landing-content";
import type { TraceExample } from "./landing-example";
import s from "./landing-sections.module.css";

export function LandingJourneySection() {
  return (
    <section id="hanh-trinh" className={s.section} aria-labelledby="journey-title">
      <div className={`${site.wrap} ${s.journeyGrid}`}>
        <div className={s.journeyIntro}>
          <h2 id="journey-title" className={site.heading}>Hành trình của một lô hàu</h2>
          <p className={site.sub}>Mỗi chặng được ghi lại ngay khi làm. Đến lúc bán, hợp tác xã công bố nguồn gốc từ chính các ghi chép đó.</p>
          <p className={s.journeyNote}>Mốc ngày là ví dụ minh họa, mỗi lô nuôi dài ngắn khác nhau.</p>
        </div>
        <div className={s.journeyCard}><JourneyLine steps={journey} label="Các chặng của một lô hàu" /></div>
      </div>
    </section>
  );
}

/** Con giống của lô mẫu, lấy từ ghi chép thả giống; không có lô thật thì không dựng mục này. */
export function LandingSeedSection({ example }: { example: TraceExample }) {
  const { seed } = example;
  if (!seed) return null;
  const rows = [
    ["Loại giống", seed.itemName],
    ...(seed.supplier ? [["Nhà cung cấp", seed.supplier] as const] : []),
    ["Ngày thả giống", seed.date],
    ["Thả tại", `Bè ${seed.raft}, ${seed.zone}`],
    ["Lô thu hoạch", example.lot],
  ] as const;
  return (
    <section id="con-giong" className={s.section} aria-labelledby="seed-title">
      <div className={`${site.wrap} ${s.seedGrid}`}>
        <div>
          <h2 id="seed-title" className={site.heading}>Nguồn gốc con giống</h2>
          <p className={site.sub}>Mỗi đợt giống nhận về đều được ghi nhà cung cấp, ngày nhận và số lượng. Nhờ vậy lô hàu thu hoạch truy ngược được về đúng đợt giống đã thả.</p>
        </div>
        <dl className={s.seedCard}>
          {rows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

export function LandingTraceSection() {
  return (
    <section id="quet-ma" className={`${s.section} ${s.white}`} aria-labelledby="trace-title">
      <div className={site.wrap}>
        <h2 id="trace-title" className={site.heading}>Quét mã, bạn thấy gì?</h2>
        <ol className={s.scanSteps}>
          {scanSteps.map((step, index) => (
            <li key={step.title}><span aria-hidden="true">{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>
          ))}
        </ol>
        <div className={s.compare}>
          <div className={s.shown}>
            <h3>Có trên trang nguồn gốc</h3>
            <ul>{shownOnTrace.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className={s.hidden}>
            <h3>Không công khai</h3>
            <ul>{hiddenOnTrace.map((item) => <li key={item}>{item}</li>)}</ul>
            <p>Lô đã rút thông tin nguồn gốc được ghi rõ trên trang.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
