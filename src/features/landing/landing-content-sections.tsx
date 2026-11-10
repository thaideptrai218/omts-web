import Link from "next/link";
import { features, flowSteps, roles } from "./landing-content";
import { ArrowRight } from "./landing-icons";
import b from "./landing.module.css";
import s from "./landing-sections.module.css";

/** Bốn chặng của quy trình khép kín, mỗi chặng một hàng. */
export function LandingFlowSection() {
  return (
    <section id="quy-trinh" className={s.section} aria-labelledby="flow-title">
      <div className={b.wrap}>
        <div className={`${s.head} ${b.reveal}`}>
          <span className={b.kicker}>Quy trình khép kín</span>
          <h2 id="flow-title" className={b.h2}>Bốn chặng, một dòng dữ liệu</h2>
          <p className={b.sub}>Mỗi chặng ghi lại đúng một việc và chuyển tiếp cho chặng sau, nên khi cần tra cứu không phải lục lại sổ tay.</p>
        </div>
        <ol className={s.steps}>
          {flowSteps.map((f) => (
            <li className={`${s.step} ${b.reveal}`} key={f.step}>
              <span className={s.stepNo} aria-hidden="true">{f.step}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Sáu nhóm người dùng và phần việc của từng nhóm. */
export function LandingRolesSection() {
  return (
    <section id="vai-tro" className={`${s.section} ${s.rolesWrap}`} aria-labelledby="roles-title">
      <div className={b.wrap}>
        <div className={`${s.head} ${b.reveal}`}>
          <span className={b.kicker}>Dành cho từng người</span>
          <h2 id="roles-title" className={b.h2}>Mỗi vai trò thấy đúng việc của mình</h2>
          <p className={b.sub}>Menu và thao tác thay đổi theo quyền được cấp. Người dùng không bị rối bởi chức năng không thuộc phần việc của họ.</p>
        </div>
        <div className={s.roles}>
          {roles.map((r) => (
            <article className={`${s.role} ${b.reveal}`} key={r.role}>
              <h3>{r.role}</h3>
              <p>{r.text}</p>
              <ul>{r.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Các điểm thiết kế cho việc thật, đánh số theo danh sách. */
export function LandingFeaturesSection() {
  return (
    <section id="tinh-nang" className={`${s.section} ${s.features}`} aria-labelledby="feat-title">
      <div className={`${b.wrap} ${s.featGrid}`}>
        <div className={`${s.featHead} ${b.reveal}`}>
          <span className={b.kicker}>Thiết kế cho việc thật</span>
          <h2 id="feat-title" className={b.h2}>Gọn trên bến, chặt chẽ ở sổ sách</h2>
        </div>
        <ul className={s.feats}>
          {features.map((f) => <li className={b.reveal} key={f.title}><h3>{f.title}</h3><p>{f.text}</p></li>)}
        </ul>
      </div>
    </section>
  );
}

/** Lời kêu gọi cuối trang. */
export function LandingCtaSection() {
  return (
    <section className={s.cta} aria-labelledby="cta-title">
      <div className={`${b.wrap} ${b.reveal}`}>
        <h2 id="cta-title">Sẵn sàng làm việc cùng OMTS?</h2>
        <p>Đăng nhập bằng tài khoản do hợp tác xã cấp, gồm cả thương lái gửi yêu cầu mua và theo dõi công nợ.</p>
        <div className={s.ctaRow}>
          <Link className={`${b.btn} ${b.btnInk} ${b.btnLg}`} href="/login">Đăng nhập <ArrowRight /></Link>
        </div>
      </div>
    </section>
  );
}
