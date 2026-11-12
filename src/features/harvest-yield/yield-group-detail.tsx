import Link from "next/link";
import { StatusPill } from "@/components/ui/management-page";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { YieldLot } from "./contracts";
import type { YieldRow } from "./yield-rows";
import { cagesOrDash, kgOrDash } from "./yield-target-cell";
import s from "./yield-screen.module.css";

const lotStatus: Record<string, string> = { Open: "Đang bán", Reopened: "Mở lại", Closed: "Đã chốt" };

/** Thanh nhỏ: phần đã bán / còn để bán trên kg ước tính của lô. Không có số liệu còn lại thì chỉ hiện phần đã bán. */
function SoldBar({ lot }: { lot: YieldLot }) {
  const total = lot.estimatedKg > 0 ? lot.estimatedKg : 0, sold = total ? Math.min(100, (lot.soldKg / total) * 100) : 0;
  return <div className={s.soldBar} role="img" aria-label={`Đã bán ${Math.round(sold)}% kg ước tính của lô`} title={`Đã bán ${kgOrDash(lot.soldKg)} · còn ${kgOrDash(lot.remainingKg)}`}><span style={{ width: `${sold}%` }} /></div>;
}

/** Chi tiết một nhóm ngay trong bảng: liên kết tới bè/vùng/chu kỳ, truy xuất và bảng các lô (mã lô mở màn truy xuất). */
export function YieldGroupDetail({ group }: { group: YieldRow }) {
  const lots = group.lots, latest = lots[0];
  return (
    <div className={s.detailBody}>
      <p className={s.detailLinks}>
        {group.raftId && <Link className="text-primary underline" href={farmingReferenceHref("raft", { zoneId: group.zoneId, recordId: group.raftId, search: group.raftCode })} aria-label={`Mở hồ sơ bè ${group.raftCode ?? ""}`}>Hồ sơ bè</Link>}
        {group.zoneId && <Link className="text-primary underline" href={farmingReferenceHref("zone", { recordId: group.zoneId, search: group.zoneCode })} aria-label={`Mở vùng ${group.zoneCode}`}>Vùng nuôi</Link>}
        {group.cycleId && <Link className="text-primary underline" href={farmingReferenceHref("cycle", { zoneId: group.zoneId, raftId: group.raftId, cycleId: group.cycleId, tab: "journey" })} aria-label="Mở hành trình của chu kỳ">Hành trình chu kỳ</Link>}
        {latest && <Link className="text-primary underline" href={farmingReferenceHref("lot", { search: latest.lotCode })}>Xem truy xuất lô gần nhất</Link>}
      </p>
      {!lots.length ? <p className={s.muted}>Nhóm này chưa có lô thu hoạch.</p> : <div className={s.tableScroll}>
        <table className={s.lots}>
          <caption className={s.srOnly}>Các lô của nhóm</caption>
          <thead><tr><th scope="col">Mã lô</th><th scope="col">Ngày thu hoạch</th><th scope="col">Trạng thái lô</th><th scope="col" className={s.num}>Số lồng</th><th scope="col" className={s.num}>Kg ước tính</th><th scope="col" className={s.num}>Đã bán</th><th scope="col" className={s.num}>Trả lại</th><th scope="col" className={s.num}>Còn lại</th><th scope="col">Đã bán / còn</th><th scope="col">Thu hoạch</th></tr></thead>
          <tbody>{lots.map((lot) => (
            <tr key={lot.id}>
              <td className={s.code}><Link className="text-primary underline underline-offset-4" href={farmingReferenceHref("lot", { search: lot.lotCode })} aria-label={`Truy xuất lô ${lot.lotCode}`}>{lot.lotCode}</Link></td>
              <td>{formatVietnameseDate(lot.harvestDate)}{!lot.inPeriod && <span className={s.muted}> · ngoài kỳ</span>}</td>
              <td>{lotStatus[lot.status] ?? lot.status}{lot.notFinal && <> <StatusPill>Chưa chốt</StatusPill></>}</td>
              <td className={s.num}>{cagesOrDash(lot.cageCount)}</td><td className={s.num}>{kgOrDash(lot.estimatedKg)}</td>
              <td className={s.num}>{kgOrDash(lot.soldKg)}</td><td className={s.num}>{kgOrDash(lot.returnedKg)}</td><td className={s.num}>{kgOrDash(lot.remainingKg)}</td>
              <td><SoldBar lot={lot} /></td>
              <td><Link className="text-primary underline underline-offset-4" href={farmingReferenceHref("harvest", { zoneId: lot.zoneId, raftId: lot.raftId, recordId: lot.id, search: lot.lotCode })} aria-label={`Mở thu hoạch bè ${lot.raftCode} để xem lô ${lot.lotCode}`}>Mở lô</Link></td>
            </tr>))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
