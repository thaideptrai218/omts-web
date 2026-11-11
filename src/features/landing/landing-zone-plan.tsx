import s from "./landing-hero.module.css";

/**
 * Mặt bằng vùng nuôi nhìn từ trên xuống: các bè, làn nuôi và phao. Vẽ bằng SVG, hoàn toàn trang trí.
 * Bè "B03" được đánh dấu, khớp với mã lô minh họa ở phần truy xuất.
 * `bright` là bản nét sáng, được che bằng mặt nạ để chỉ lộ ra quanh con trỏ chuột.
 */
const COLS = 7;
const ROWS = 5;
const W = 150;
const H = 56;
const GAP_X = 34;
const GAP_Y = 46;
const MARK = { col: 4, row: 2 } as const;
const LANES = [14, 28, 42] as const;
const TEAL = "#3cc6cf";
const PAPER = "#f5f7fa";

export function LandingZonePlan({ className, bright = false }: { className?: string; bright?: boolean }) {
  const rafts = Array.from({ length: COLS * ROWS }, (_, i) => ({ col: i % COLS, row: Math.floor(i / COLS) }));
  const mx = MARK.col * (W + GAP_X);
  const my = MARK.row * (H + GAP_Y);

  return (
    <svg className={`${className ?? ""} ${s.planDrift}`} viewBox="0 0 1400 760" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <g transform="translate(120 150) rotate(-7 560 280)" fill="none" strokeWidth="1.25">
        {rafts.map(({ col, row }) => {
          const x = col * (W + GAP_X);
          const y = row * (H + GAP_Y);
          const hot = col === MARK.col && row === MARK.row;
          const delay = `${(col + row) * 0.09}s`;
          return (
            <g key={`${col}-${row}`} className={bright ? undefined : s.raft} style={bright ? undefined : { animationDelay: delay }} transform={`translate(${x} ${y})`} stroke={hot ? TEAL : PAPER} strokeOpacity={hot ? 1 : bright ? 0.9 : 0.2}>
              <rect className={bright ? undefined : s.outline} pathLength={1} width={W} height={H} style={bright ? undefined : { animationDelay: delay }} />
              {LANES.map((ly) => <line key={ly} x1="0" y1={ly} x2={W} y2={ly} strokeOpacity={hot ? 0.55 : bright ? 0.5 : 0.1} />)}
              {[[0, 0], [W, 0], [0, H], [W, H]].map(([bx, by]) => (
                <rect key={`${bx}-${by}`} x={bx - 4} y={by - 4} width="8" height="8" fill={hot ? TEAL : bright ? PAPER : "#10243a"} />
              ))}
            </g>
          );
        })}
        {!bright && (
          <>
            <rect className={s.ring} x={mx - 8} y={my - 8} width={W + 16} height={H + 16} stroke={TEAL} />
            {/* Đường ngắm xuyên qua bè được đánh dấu */}
            <g className={s.sight} stroke={TEAL} strokeOpacity="0.45" strokeDasharray="3 7">
              <line x1={mx + W / 2} y1="-260" x2={mx + W / 2} y2="760" />
              <line x1="-320" y1={my + H / 2} x2="1500" y2={my + H / 2} />
            </g>
            <g transform={`translate(${mx} ${my - 24})`}>
              <text fill={TEAL} stroke="none" fontFamily="var(--font-geist-mono), monospace" fontSize="15" letterSpacing="2.4">BÈ B03</text>
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
