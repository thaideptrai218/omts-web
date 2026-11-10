import type { FlowStep } from "./landing-content";

/** Bộ icon nét 1.75px cùng một họ, dùng chung cho trang giới thiệu. Trang trí nên ẩn khỏi trình đọc màn hình. */
const base = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function StepIcon({ name }: { name: FlowStep["icon"] }) {
  switch (name) {
    case "raft":
      return <svg {...base}><path d="M3 8h18v4H3zM3 12v4h18v-4M7 8v8M12 8v8M17 8v8" /><path d="M2 20c2 0 2-1.2 4-1.2S8 20 10 20s2-1.2 4-1.2S16 20 18 20s2-1.2 4-1.2" /></svg>;
    case "harvest":
      return <svg {...base}><path d="M5 14c0-4 3-8 7-8s7 4 7 8c0 3-3 5-7 5s-7-2-7-5z" /><path d="M9 13c1-2 2-3 3-3s2 1 3 3M12 10v8" /></svg>;
    case "sale":
      return <svg {...base}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>;
    case "qr":
      return <svg {...base}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2v2h-2zM18 14h2v6h-4M14 18h2" /></svg>;
  }
}

export function ArrowRight() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}

/** Hình minh họa vùng nuôi: các bè hàu nổi trên mặt nước, vẽ bằng SVG để không phụ thuộc ảnh ngoài. */
export function RaftIllustration({ className }: { className?: string }) {
  const rafts = [[40, 150], [150, 130], [260, 155], [370, 135], [95, 205], [205, 190], [315, 210]] as const;
  return (
    <svg className={className} viewBox="0 0 480 300" role="img" aria-label="Minh họa các bè nuôi hàu nổi trên mặt nước">
      <defs>
        <linearGradient id="lp-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c5560" /><stop offset="1" stopColor="#04222a" /></linearGradient>
        <linearGradient id="lp-deck" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e8b04a" /><stop offset="1" stopColor="#b9801f" /></linearGradient>
      </defs>
      <rect width="480" height="300" rx="28" fill="url(#lp-sea)" />
      {[70, 120, 175, 235].map((y, i) => <path key={y} d={`M0 ${y} Q 60 ${y - 12} 120 ${y} T 240 ${y} T 360 ${y} T 480 ${y}`} fill="none" stroke="#5fd3c4" strokeOpacity={0.12 + i * 0.05} strokeWidth="2" />)}
      {rafts.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <rect y="14" width="76" height="12" rx="3" fill="#031a20" opacity="0.55" />
          <rect width="76" height="14" rx="3" fill="url(#lp-deck)" />
          {[12, 26, 40, 54, 68].map((dx) => <line key={dx} x1={dx} y1="14" x2={dx} y2="40" stroke="#bfe9e4" strokeOpacity="0.45" strokeWidth="1.5" />)}
          {[16, 30, 44, 58].map((dx) => <ellipse key={dx} cx={dx} cy="42" rx="5" ry="3.4" fill="#f4f1ea" opacity="0.9" />)}
        </g>
      ))}
    </svg>
  );
}
