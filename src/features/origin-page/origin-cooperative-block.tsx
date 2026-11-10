import type { ProvenanceCooperative } from "@/server/public/origin-page-schema";
import type { OriginCopy } from "./origin-copy";
import { formatOriginDate, safeWebHref, telHref } from "./origin-format";
import s from "./origin-base.module.css";

type Props = { cooperative: ProvenanceCooperative; copy: OriginCopy };

const EMAIL = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/u;
const hostOf = (href: string) => new URL(href).host;

export function OriginCooperativeBlock({ cooperative: c, copy }: Props) {
  const phone = telHref(c.phoneNumber);
  const website = safeWebHref(c.website);
  const social = safeWebHref(c.socialLink);
  const subtitle = [c.shortName, c.yearEstablished ? `${copy.founded} ${c.yearEstablished}` : null].filter(Boolean).join(" · ");
  return (
    <section className={s.coop} aria-labelledby="origin-coop">
      <p className={s.sectionLabel}>{copy.coopHeading}</p>
      <h2 id="origin-coop" className={s.coopName}>{c.fullName}</h2>
      {subtitle ? <p className={s.coopSub}>{subtitle}</p> : null}
      <ul className={s.contactList}>
        {c.officeAddress ? <li>{c.officeAddress}</li> : null}
        {c.phoneNumber ? <li>{copy.phone}: {phone ? <a href={phone}>{c.phoneNumber}</a> : c.phoneNumber}</li> : null}
        {c.email ? <li>{EMAIL.test(c.email) ? <a href={`mailto:${c.email}`}>{c.email}</a> : c.email}</li> : null}
        {website ? <li><a href={website} target="_blank" rel="noopener noreferrer">{hostOf(website)}</a></li> : null}
        {social ? <li><a href={social} target="_blank" rel="noopener noreferrer">{hostOf(social)}</a></li> : null}
      </ul>
      {c.introduction ? <p className={s.intro}>{c.introduction}</p> : null}
      {c.certifications.length > 0 ? (
        <div>
          <h3 className={s.certTitle}>{copy.certifications}</h3>
          <ul className={s.certList}>
            {c.certifications.map((cert, index) => (
              <li key={`${cert.name}-${index}`} className={`${s.cert} ${cert.state === "Valid" ? s.certOk : cert.state === "ExpiringSoon" ? s.certSoon : s.certOver}`}>
                <strong>{cert.name}</strong>
                <span>{copy.certState[cert.state]}{cert.expiryDate ? ` · ${copy.expires} ${formatOriginDate(cert.expiryDate)}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
