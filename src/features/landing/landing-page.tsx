import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { features, flowSteps, navLinks, roles, sampleTrace } from "./landing-content";
import { ArrowRight, CheckIcon, RaftIllustration, StepIcon } from "./landing-icons";
import s from "./landing.module.css";

/** Trang giới thiệu công khai tại "/". Máy chủ render hoàn toàn, không cần phiên đăng nhập. */
export function LandingPage() {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#noi-dung">Bỏ qua điều hướng</a>
      <header className={s.header}>
        <div className={`${s.wrap} ${s.bar}`}>
          <Link href="/" aria-label="HTX Trung Nam, về đầu trang"><BrandMark tone="inverse" compact /></Link>
          <nav className={s.nav} aria-label="Điều hướng trang giới thiệu">
            {navLinks.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <div className={s.actions}>
            <Link className={`${s.btn} ${s.btnGhost} ${s.hideSm}`} href="/register">Đăng ký thương lái</Link>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/login">Đăng nhập</Link>
          </div>
        </div>
      </header>

      <main id="noi-dung">
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <div>
              <span className={`${s.eyebrow} ${s.rise}`}><span className={s.dot} aria-hidden="true" />Hợp tác xã nuôi hàu · Vân Đồn, Quảng Ninh</span>
              <h1 id="hero-title" className={`${s.h1} ${s.rise2}`}>Từ bè hàu đến bàn ăn, <em>minh bạch từng lô</em></h1>
              <p className={`${s.lead} ${s.rise3}`}>OMTS giúp hợp tác xã Trung Nam quản lý nuôi trồng, thu hoạch, bán hàng và công nợ trên một hệ thống, đồng thời cho người mua quét mã QR để biết con hàu đến từ đâu.</p>
              <div className={`${s.ctaRow} ${s.rise3}`}>
                <Link className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="/login">Vào hệ thống <ArrowRight /></Link>
                <a className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} href="#quy-trinh">Xem quy trình</a>
              </div>
              <ul className={s.trust}>
                {["Phân quyền theo vùng nuôi", "Hóa đơn gắn từng lô thu hoạch", "Giao diện tiếng Việt, dùng được trên điện thoại"].map((t) => <li key={t}><CheckIcon />{t}</li>)}
              </ul>
            </div>
            <div className={s.visual}>
              <RaftIllustration />
              <aside className={s.qrCard} aria-label="Ví dụ trang nguồn gốc">
                <span className={s.qrTag}>Nguồn gốc · ví dụ minh họa</span>
                <div className={s.qrLot}>{sampleTrace.lot}</div>
                <p className={s.qrMeta}>{sampleTrace.zone}</p>
                <p className={s.qrNote}>Dữ liệu minh họa giao diện, không phải lô thật.</p>
              </aside>
            </div>
          </div>
          <div className={s.waves} aria-hidden="true">
            <svg viewBox="0 0 1440 56" preserveAspectRatio="none"><path fill="currentColor" d="M0 28c120 24 240 24 360 8s240-32 360-24 240 36 360 36 240-24 360-12v20H0z" /></svg>
          </div>
        </section>

        <section id="quy-trinh" className={s.section} aria-labelledby="flow-title">
          <div className={s.wrap}>
            <div className={s.head}>
              <span className={s.kicker}>Quy trình khép kín</span>
              <h2 id="flow-title" className={s.h2}>Bốn chặng, một dòng dữ liệu</h2>
              <p className={s.sub}>Mỗi chặng ghi lại đúng một việc và chuyển tiếp cho chặng sau, nên khi cần tra cứu không phải lục lại sổ tay.</p>
            </div>
            <ol className={s.steps}>
              {flowSteps.map((f) => (
                <li className={s.step} key={f.step}>
                  <span className={s.stepNo} aria-hidden="true">{f.step}</span>
                  <span className={s.stepIcon}><StepIcon name={f.icon} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="truy-xuat" className={`${s.section} ${s.dark}`} aria-labelledby="trace-title">
          <div className={`${s.wrap} ${s.traceGrid}`}>
            <div>
              <span className={s.kicker}>Truy xuất nguồn gốc</span>
              <h2 id="trace-title" className={s.h2}>Quét một mã, thấy cả hành trình của lô hàu</h2>
              <p className={s.sub}>Khi bán hàng, hợp tác xã có thể công bố nguồn gốc của các lô trên hóa đơn. Người mua xem được thông tin đã công bố, không cần đăng nhập. Lô có vấn đề được thu hồi thì trang báo rõ.</p>
              <ol className={s.timeline} style={{ marginTop: "2rem" }}>
                {sampleTrace.rows.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}
              </ol>
            </div>
            <div className={s.phone} role="img" aria-label="Minh họa màn hình người mua sau khi quét mã QR">
              <div className={s.phoneTop}><strong>Nguồn gốc lô hàng</strong><span className={s.badge}>Đang hiệu lực</span></div>
              <div className={s.qrBox} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" /><path d="M5.5 5.5h2v2h-2zM16.5 5.5h2v2h-2zM5.5 16.5h2v2h-2zM14 14h2.5v2.5H14zM18.5 14H21v2.5h-2.5zM14 18.5h2.5V21H14zM18.5 18.5H21V21h-2.5z" fill="currentColor" /></svg>
              </div>
              <dl><div><dt>Mã lô</dt><dd>{sampleTrace.lot}</dd></div><div><dt>Vùng nuôi</dt><dd>{sampleTrace.zone}</dd></div></dl>
            </div>
          </div>
        </section>

        <section id="vai-tro" className={s.section} aria-labelledby="roles-title">
          <div className={s.wrap}>
            <div className={s.head}>
              <span className={s.kicker}>Dành cho từng người</span>
              <h2 id="roles-title" className={s.h2}>Mỗi vai trò thấy đúng việc của mình</h2>
              <p className={s.sub}>Menu và thao tác thay đổi theo quyền được cấp. Người dùng không bị rối bởi chức năng không thuộc phần việc của họ.</p>
            </div>
            <div className={s.roles}>
              {roles.map((r) => (
                <article className={s.role} key={r.role}>
                  <h3>{r.role}</h3><p>{r.text}</p>
                  <ul>{r.points.map((p) => <li key={p}><CheckIcon />{p}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="tinh-nang" className={`${s.section}`} style={{ paddingTop: 0 }} aria-labelledby="feat-title">
          <div className={s.wrap}>
            <div className={s.head}>
              <span className={s.kicker}>Thiết kế cho việc thật</span>
              <h2 id="feat-title" className={s.h2}>Gọn trên bến, chặt chẽ ở sổ sách</h2>
            </div>
            <div className={s.bento}>
              {features.map((f) => <div key={f.title} className={`${s.cell} ${f.size === "wide" ? s.wide : ""}`}><h3>{f.title}</h3><p>{f.text}</p></div>)}
            </div>
          </div>
        </section>

        <section className={s.section} style={{ paddingTop: 0 }} aria-labelledby="cta-title">
          <div className={s.wrap}>
            <div className={s.cta}>
              <h2 id="cta-title">Sẵn sàng làm việc cùng OMTS?</h2>
              <p>Đăng nhập bằng tài khoản do hợp tác xã cấp. Thương lái có thể đăng ký tài khoản để gửi yêu cầu mua và theo dõi công nợ.</p>
              <div className={s.ctaRow}>
                <Link className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="/login">Đăng nhập</Link>
                <Link className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} href="/register">Đăng ký thương lái</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footRow}`}>
          <BrandMark tone="inverse" compact />
          <span>Hệ thống quản lý nuôi hàu và truy xuất nguồn gốc · Vân Đồn, Quảng Ninh</span>
          <Link href="/login">Đăng nhập</Link>
        </div>
      </footer>
    </div>
  );
}
