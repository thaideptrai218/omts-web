import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { YieldLot } from "./contracts";
import { cagesOrDash, kgOrDash } from "./yield-target-cell";
import s from "./yield-screen.module.css";

const lotStatus: Record<string, string> = { Open: "Đang bán", Reopened: "Mở lại", Closed: "Đã chốt" };

/** Các lô của một nhóm: số lồng, kg ước tính, đã bán, còn để bán; mã lô mở đúng lô trong màn Thu hoạch. */
export function YieldLotsTable({ lots }: { lots: YieldLot[] }) {
  return (
    <table className={s.lots}>
      <caption className={s.srOnly}>Các lô của nhóm</caption>
      <thead><tr><th scope="col">Mã lô</th><th scope="col">Ngày thu hoạch</th><th scope="col">Trạng thái lô</th><th scope="col" className={s.num}>Số lồng</th><th scope="col" className={s.num}>Kg ước tính</th><th scope="col" className={s.num}>Đã bán</th><th scope="col" className={s.num}>Còn để bán</th></tr></thead>
      <tbody>{lots.map((lot) => (
        <tr key={lot.id}>
          <td className={s.code}>
            <Link
              className="text-primary underline underline-offset-4"
              href={farmingReferenceHref("harvest", { zoneId: lot.zoneId, raftId: lot.raftId, recordId: lot.id, search: lot.lotCode })}
              aria-label={`Mở thu hoạch bè ${lot.raftCode} để xem lô ${lot.lotCode}`}
            >{lot.lotCode}</Link>
          </td>
          <td>{formatVietnameseDate(lot.harvestDate)}{!lot.inPeriod && <span className={s.muted}> · ngoài kỳ</span>}</td>
          <td>{lotStatus[lot.status] ?? lot.status}{lot.notFinal && <> <StatusPill>Chưa chốt</StatusPill></>}</td>
          <td className={s.num}>{cagesOrDash(lot.cageCount)}</td><td className={s.num}>{kgOrDash(lot.estimatedKg)}</td>
          <td className={s.num}>{kgOrDash(lot.soldKg)}</td><td className={s.num}>{kgOrDash(lot.remainingKg)}</td>
        </tr>))}
      </tbody>
    </table>
  );
}
