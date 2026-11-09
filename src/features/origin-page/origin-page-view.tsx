import type { ProvenancePage } from "@/server/public/origin-page-schema";
import { originCopy } from "./origin-copy";
import { OriginCooperativeBlock } from "./origin-cooperative-block";
import { formatOriginDate, telHref } from "./origin-format";
import { OriginLotCard } from "./origin-lot-card";
import { OriginPageShell } from "./origin-page-shell";
import s from "./origin-base.module.css";

type Props = { page: ProvenancePage; langHrefs: Readonly<{ vi: string; en: string }> };

/** Trang nguồn gốc công khai (SCR-ORIGIN-01) khi backend trả 200: Ok, NoLots hoặc Cancelled. */
export function OriginPageView({ page, langHrefs }: Props) {
  const copy = originCopy(page.language);
  const phone = telHref(page.cooperative.phoneNumber);
  const invoiceDate = page.invoice?.date ?? null;
  const hero = (
    <section className={s.hero} aria-labelledby="origin-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{copy.eyebrow}</p>
        <h1 id="origin-title" className={s.title}>
          {page.invoice ? `${copy.invoice} ${page.invoice.code}` : page.cooperative.shortName ?? page.cooperative.fullName}
          {page.invoice ? <span className={s.titleDate}> · {copy.invoiceDate} <time dateTime={page.invoice.date}>{formatOriginDate(page.invoice.date)}</time></span> : null}
        </h1>
        <p className={s.lead}>{copy.lead}</p>
      </div>
    </section>
  );
  return (
    <OriginPageShell language={page.language} copy={copy} langHrefs={langHrefs} hero={hero}>
      <OriginCooperativeBlock cooperative={page.cooperative} copy={copy} />
      {page.status === "Ok" ? (
        <section aria-labelledby="origin-lots">
          <h2 id="origin-lots" className={s.lotsHeading}>{copy.lotsHeading} <span className={s.count}>({page.lots.length})</span></h2>
          <div className={s.lotList}>
            {page.lots.map((lot) => <OriginLotCard key={lot.lotCode} lot={lot} invoiceDate={invoiceDate} copy={copy} />)}
          </div>
        </section>
      ) : (
        <section className={s.notice} aria-labelledby="origin-notice">
          <h2 id="origin-notice" className={s.noticeTitle}>{page.status === "Cancelled" ? copy.cancelledTitle : copy.noLotsTitle}</h2>
          <p>{page.message}</p>
          {phone ? <a className={s.retry} href={phone}>{copy.contact}</a> : null}
        </section>
      )}
    </OriginPageShell>
  );
}
