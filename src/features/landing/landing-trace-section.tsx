import { sampleTrace } from "./landing-content";
import { SampleQr } from "./landing-sample-qr";
import b from "./landing.module.css";
import s from "./landing-trace.module.css";

/** Truy xuất nguồn gốc: giải thích luồng quét QR và minh họa tem lô (dữ liệu minh họa, không phải lô thật). */
export function LandingTraceSection() {
  return (
    <section id="truy-xuat" className={s.trace} aria-labelledby="trace-title">
      <div className={`${b.wrap} ${s.grid}`}>
        <div className={b.reveal}>
          <span className={b.kicker}>Truy xuất nguồn gốc</span>
          <h2 id="trace-title" className={b.h2}>Quét một mã, thấy cả hành trình của lô hàu</h2>
          <p className={b.sub}>Khi bán hàng, hợp tác xã có thể công bố nguồn gốc của các lô trên hóa đơn. Người mua xem được thông tin đã công bố, không cần đăng nhập. Lô có vấn đề được thu hồi thì trang báo rõ.</p>
          <ul className={s.rows}>
            {sampleTrace.rows.map(([title, text]) => <li className={b.reveal} key={title}><strong>{title}</strong><span>{text}</span></li>)}
          </ul>
        </div>
        <div className={s.tag} role="img" aria-label={`Minh họa tem nguồn gốc lô ${sampleTrace.lot}, ${sampleTrace.zone}. Dữ liệu minh họa, không phải lô thật.`}>
          <div className={s.tagTop}><span>Nguồn gốc lô hàng</span><span className={s.badge}>Đang hiệu lực</span></div>
          <div className={s.qr}><SampleQr /><span className={s.scan} aria-hidden="true" /></div>
          <div className={s.cut} />
          <p className={s.lot}>{sampleTrace.lot}</p>
          <dl><div><dt>Vùng nuôi</dt><dd>{sampleTrace.zone}</dd></div></dl>
          <p className={s.note}>Dữ liệu minh họa giao diện, không phải lô thật.</p>
        </div>
      </div>
    </section>
  );
}
