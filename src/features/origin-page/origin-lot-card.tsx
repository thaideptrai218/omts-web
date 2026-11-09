import type { ProvenanceLot } from "@/server/public/origin-page-schema";
import type { OriginCopy } from "./origin-copy";
import { formatOriginDate, mapHref } from "./origin-format";
import { ExternalIcon, PinIcon, ShieldCheckIcon, UndoIcon } from "./origin-icons";
import { OriginLotGallery } from "./origin-lot-gallery";
import { OriginLotTimeline } from "./origin-lot-timeline";
import s from "./origin-lot.module.css";

type Props = { lot: ProvenanceLot; invoiceDate: string | null; copy: OriginCopy };

function Products({ lot, copy }: Props) {
  if (lot.products.length === 0) return null;
  return <p className={s.products}>{copy.products}: <strong>{lot.products.join(", ")}</strong></p>;
}

function WithdrawnLot({ lot, copy }: Props) {
  return (
    <article className={`${s.card} ${s.cardWithdrawn}`} aria-labelledby={`lot-${lot.lotCode}`}>
      <header className={s.cardHead}>
        <h3 id={`lot-${lot.lotCode}`} className={s.lotTitle}>{copy.lot} {lot.lotCode}</h3>
        <span className={`${s.badge} ${s.badgeWithdrawn}`}><UndoIcon />{copy.withdrawn}</span>
      </header>
      <Products lot={lot} invoiceDate={null} copy={copy} />
      {/* MSG-ORIGIN-01 nguyên văn từ API; lý do thu hồi không bao giờ có trong dữ liệu công khai. */}
      <p className={s.withdrawnNote} role="note">{lot.message}</p>
      {lot.withdrawalDate ? <p className={s.withdrawnDate}>{copy.withdrawnOn}: <time dateTime={lot.withdrawalDate}>{formatOriginDate(lot.withdrawalDate)}</time></p> : null}
    </article>
  );
}

export function OriginLotCard({ lot, invoiceDate, copy }: Props) {
  if (lot.originState === "Withdrawn" || !lot.origin) return <WithdrawnLot lot={lot} invoiceDate={invoiceDate} copy={copy} />;
  const { origin } = lot;
  return (
    <article className={s.card} aria-labelledby={`lot-${lot.lotCode}`}>
      <header className={s.cardHead}>
        <h3 id={`lot-${lot.lotCode}`} className={s.lotTitle}>{copy.lot} {lot.lotCode}</h3>
        <span className={`${s.badge} ${s.badgeValid}`}><ShieldCheckIcon />{copy.valid}</span>
      </header>
      <Products lot={lot} invoiceDate={invoiceDate} copy={copy} />
      <div className={s.cardBody}>
        <dl className={s.facts}>
          <div><dt>{copy.harvestDate}</dt><dd>{formatOriginDate(origin.harvestDate)}</dd></div>
          <div><dt>{copy.raft}</dt><dd>{origin.raftCode}</dd></div>
          <div><dt>{copy.zone}</dt><dd>{origin.zoneName}</dd></div>
          <div><dt>{copy.farmingDays}</dt><dd>{origin.daysOfFarming == null ? copy.noFarmingData : `${origin.daysOfFarming} ${copy.days}`}</dd></div>
          <div>
            <dt>{copy.seeding}</dt>
            <dd>
              {origin.seedings.length === 0 ? copy.noSeeding : (
                <ul className={s.plainList}>
                  {origin.seedings.map((seeding, index) => (
                    <li key={`${seeding.seedingDate}-${index}`}>{formatOriginDate(seeding.seedingDate)} · {seeding.seedItemName}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
        {origin.map ? (
          <a className={s.mapCard} href={mapHref(origin.map.latitude, origin.map.longitude)} target="_blank" rel="noopener noreferrer">
            <span className={s.mapPin}><PinIcon size={20} /></span>
            <span className={s.mapText}>
              <strong>{origin.map.source === "Raft" ? copy.locationRaft : copy.locationZone}</strong>
              <span>{origin.map.latitude.toFixed(5)}, {origin.map.longitude.toFixed(5)}</span>
            </span>
            <span className={s.mapAction}>{copy.openMap}<ExternalIcon /></span>
          </a>
        ) : null}
      </div>
      <OriginLotTimeline lot={lot} invoiceDate={invoiceDate} copy={copy} />
      <OriginLotGallery heading={copy.harvestPhotos} kind={copy.harvestPhotos} lotCode={lot.lotCode} photos={origin.harvestPhotoUrls} copy={copy} />
      <OriginLotGallery heading={copy.raftPhotos} kind={copy.raftPhotos} lotCode={lot.lotCode} photos={origin.raftPhotoUrls} copy={copy} />
    </article>
  );
}
