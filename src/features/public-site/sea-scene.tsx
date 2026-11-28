// Hình vẽ minh họa vùng nuôi Vân Đồn: núi đá trên vịnh, bè nổi và dây hàu treo dưới nước. Thuần trang trí.
// Chuyển động chỉ bằng CSS (sóng trôi, bè nhấp nhô, dây hàu đung đưa, cá bơi); tắt khi người dùng giảm chuyển động.
import s from "./sea-scene.module.css";

const RAFTS = [
  { x: 140, w: 240, ropes: [168, 214, 260, 306, 352] },
  { x: 442, w: 288, ropes: [470, 516, 562, 608, 654, 700] },
  { x: 792, w: 240, ropes: [820, 866, 912, 958, 1004] },
];
const FISH = [{ y: 330, delay: "0s", time: "26s" }, { y: 392, delay: "-11s", time: "34s" }, { y: 282, delay: "-20s", time: "30s" }];

function Rope({ x, index }: { x: number; index: number }) {
  const length = 120 + ((index * 37) % 70);
  const oysters = Array.from({ length: Math.floor(length / 26) }, (_, i) => 248 + i * 26);
  return (
    <g className={s.rope} style={{ transformOrigin: `${x}px 206px`, animationDelay: `${-index * 0.45}s` }}>
      <path d={`M${x} 206V${206 + length}`} stroke="#d9c9a3" strokeWidth="2" />
      {oysters.map((y, i) => (
        <g key={y} transform={`translate(${x} ${y}) rotate(${i % 2 ? 26 : -26})`}>
          <ellipse rx="13" ry="8" fill="#b9c6c1" />
          <path d="M-9 1Q0 -5 10 0" stroke="#6f8782" strokeWidth="1.500" fill="none" />
        </g>
      ))}
    </g>
  );
}

export function SeaScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="1200" height="200" fill="#cfe9e6" />
      <circle className={s.sun} cx="1040" cy="104" r="30" fill="#f2b84b" />
      <path d="M0 196V150Q40 82 82 128Q110 60 150 120Q170 150 215 196ZM690 196Q725 96 765 140Q800 56 845 128Q870 164 905 196ZM930 196Q975 120 1010 158Q1062 90 1105 150Q1140 120 1200 168V196Z" fill="#8dbdb7" />
      <path d="M250 196Q300 92 340 150Q372 118 410 196ZM1100 196Q1140 118 1200 140V196Z" fill="#5b9a96" />
      <rect y="196" width="1200" height="244" fill="#0b6b70" />
      {/* Mỗi lớp sóng rộng hơn khung một nhịp 600 để trôi liên tục không hở mép. */}
      <path className={s.swellFar} d="M-600 300Q-450 280 -300 300T0 300T300 300T600 300T900 300T1200 300T1500 300T1800 300V440H-600Z" fill="#07565d" />
      <path className={s.swellNear} d="M-600 372Q-450 354 -300 372T0 372T300 372T600 372T900 372T1200 372T1500 372T1800 372V440H-600Z" fill="#07434b" />
      {FISH.map((fish) => (
        <g key={fish.y} className={s.fish} style={{ animationDelay: fish.delay, animationDuration: fish.time }}>
          <path transform={`translate(0 ${fish.y})`} d="M0 0Q14 -10 30 0Q14 10 0 0ZM0 0L-10 -7V7Z" fill="#8fd3cc" opacity=".75" />
        </g>
      ))}
      {RAFTS.map(({ x, w, ropes }, raft) => (
        <g key={x} className={s.raft} style={{ animationDelay: `${-raft * 1.3}s` }}>
          {ropes.map((rope, i) => <Rope key={rope} x={rope} index={raft * 6 + i} />)}
          <rect x={x} y="188" width={w} height="12" rx="3" fill="#8a6a45" />
          <path d={`M${x + 8} 188v-12M${x + w / 2} 188v-12M${x + w - 8} 188v-12M${x} 178h${w}`} stroke="#6b4f33" strokeWidth="4" />
          {Array.from({ length: Math.floor(w / 48) }, (_, i) => <rect key={i} x={x + 8 + i * 48} y="199" width="32" height="14" rx="7" fill="#f4f7f6" />)}
        </g>
      ))}
      <g className={s.ripples}>
        <path d="M0 214q25-8 50 0t50 0M420 222q25-8 50 0t50 0M740 216q25-8 50 0t50 0M1090 220q25-8 50 0t50 0" stroke="#bfe3df" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
