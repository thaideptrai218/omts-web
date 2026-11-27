import Link from "next/link";
import { ProductIntro } from "@/features/public-site/product-intro";
import { SeaScene } from "@/features/public-site/sea-scene";
import site from "@/features/public-site/public-site.module.css";
import type { ProvenancePage } from "@/server/public/origin-page-schema";
import { originCopy } from "./origin-copy";
import { OriginCooperativeBlock } from "./origin-cooperative-block";
import { formatOriginDate, telHref } from "./origin-format";
import { ShieldCheckIcon } from "./origin-icons";
import { OriginLotCard } from "./origin-lot-card";
import { OriginPageShell } from "./origin-page-shell";
import { OriginTabs } from "./origin-tabs";
import s from "./origin-base.module.css";

type Props = { page: ProvenancePage; sampleNotice?: string };

/** Trang nguồn gốc công khai (SCR-ORIGIN-01) khi backend trả 200: Ok, NoLots hoặc Cancelled. */
export function OriginPageView({ page, sampleNotice }: Props) {
  const copy = originCopy();
  const phone = telHref(page.cooperative.phoneNumber);
  // Sản phẩm của các lô đang hiệu lực (không lộ số lượng): tên sản phẩm là tiêu đề; không còn lô nào thì dùng tên HTX.
  const published = page.lots.filter((lot) => lot.originState === "Published");
  const products = [...new Set(published.flatMap((lot) => lot.products))];
  const cooperativeName = page.cooperative.fullName;
  return (
    <OriginPageShell
      copy={copy}
      brand={{ name: cooperativeName, logoUrl: page.cooperative.logoUrl ?? null }}
    >
      {sampleNotice ? <p className={s.sample} role="note">{sampleNotice} <Link href="/">Về trang giới thiệu</Link></p> : null}
      <section className={s.hero} aria-labelledby="origin-title">
        <div className={`${site.wrap} ${s.heroGrid}`}>
          <div className={s.heroText}>
            {published.length > 0
              ? <p className={site.chip}><ShieldCheckIcon />{copy.publishedChip}</p>
              : <p className={site.eyebrow}>{copy.eyebrow}</p>}
            <h1 id="origin-title" className={s.title}>{products.length > 0 ? products.join(", ") : cooperativeName}</h1>
            {products.length > 0 ? <p className={s.titleCoop}>{cooperativeName}</p> : null}
            {page.invoice ? <p className={s.invoiceLine}>{`${copy.invoice} ${page.invoice.code} · ${copy.invoiceDate}`} <time dateTime={page.invoice.date}>{formatOriginDate(page.invoice.date)}</time></p> : null}
            <p className={s.lead}>{copy.lead}</p>
          </div>
          <div className={s.cover}>
            {page.cooperative.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa HTX qua proxy ảnh của trang công khai, không đi qua trình tối ưu ảnh của Next
              <img src={page.cooperative.coverPhotoUrl} alt="" decoding="async" referrerPolicy="no-referrer" />
            ) : <SeaScene />}
          </div>
        </div>
      </section>
      <div className={`${site.wrap} ${s.content}`}>
        <OriginTabs
          label={copy.tabsLabel}
          tabs={[
            {
              id: "nguon-goc", label: copy.tabProduct,
              content: page.status === "Ok" ? (
                <section aria-labelledby="origin-lots">
                  <h2 id="origin-lots" className={s.lotsHeading}>{copy.lotsHeading} <span className={s.count}>({page.lots.length})</span></h2>
                  <div className={s.lotList}>
                    {page.lots.map((lot) => <OriginLotCard key={lot.lotCode} lot={lot} copy={copy} />)}
                  </div>
                  {page.productDetails?.length ? (
                    <>
                      <h2 className={s.productsHeading}>{copy.aboutProduct}</h2>
                      <div className={s.lotList}>{page.productDetails.map((product) => <ProductIntro key={product.name} product={product} />)}</div>
                    </>
                  ) : null}
                </section>
              ) : (
                <section className={s.notice} aria-labelledby="origin-notice">
                  <h2 id="origin-notice" className={s.noticeTitle}>{page.status === "Cancelled" ? copy.cancelledTitle : copy.noLotsTitle}</h2>
                  <p>{page.message}</p>
                  {phone ? <a className={site.button} href={phone}>{copy.contact}</a> : null}
                </section>
              ),
            },
            { id: "don-vi", label: copy.tabCooperative, content: <OriginCooperativeBlock cooperative={page.cooperative} copy={copy} /> },
          ]}
        />
      </div>
    </OriginPageShell>
  );
}
