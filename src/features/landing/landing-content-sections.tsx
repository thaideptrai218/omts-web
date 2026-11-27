import { JourneyLine } from "@/features/public-site/journey-line";
import site from "@/features/public-site/public-site.module.css";
import { hiddenOnTrace, journey, scanSteps, shownOnTrace } from "./landing-content";
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
