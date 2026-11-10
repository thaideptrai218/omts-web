import { flowSteps } from "./landing-content";
import s from "./landing-sections.module.css";

/** Dải chữ lớn chạy ngang giữa hero và quy trình. Trang trí thuần túy nên ẩn khỏi trình đọc màn hình. */
export function LandingMarquee() {
  const words = flowSteps.map((f) => f.title);
  // Hai bản giống hệt nhau nối liền: dịch -50% là lặp vô hạn không giật.
  const run = [0, 1].map((n) => (
    <ul className={s.marqueeRun} key={n}>
      {[...words, ...words].map((w, i) => <li key={`${n}-${i}`}>{w}</li>)}
    </ul>
  ));
  return <div className={s.marquee} aria-hidden="true"><div className={s.marqueeTrack}>{run}</div></div>;
}
