import { num, vnd } from "./claim-labels";
import s from "./claims.module.css";

type Line = { productName: string; lotCode: string; kg: number; unitPrice: number | null; amount: number | null };

/** Dòng hàng của hóa đơn trong một khiếu nại. Thương lái không nhận giá (unitPrice / amount rỗng) nên cột giá chỉ hiện khi `prices`. Bảng nằm trong khung cuộn ngang. */
export function ClaimLinesTable({ lines, prices }: { lines: readonly Line[]; prices: boolean }) {
  return (
    <div className={s.frame} style={{ position: "relative" }}>
      <table className={s.table} style={{ minWidth: prices ? "34rem" : "22rem" }} aria-label="Dòng hàng của hóa đơn">
        <thead><tr>
          <th scope="col">Sản phẩm</th><th scope="col">Lô thu hoạch</th><th scope="col" className={s.num}>kg</th>
          {prices && <><th scope="col" className={s.num}>Đơn giá</th><th scope="col" className={s.num}>Thành tiền</th></>}
        </tr></thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.lotCode}-${index}`}>
              <td>{line.productName}</td><td>{line.lotCode}</td><td className={s.num}>{num(line.kg)}</td>
              {prices && <><td className={s.num}>{vnd(line.unitPrice)}</td><td className={s.num}>{vnd(line.amount)}</td></>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
