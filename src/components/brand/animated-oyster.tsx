"use client";
import { useEffect, useRef } from "react";
import s from "./animated-oyster.module.css";

/** Bọt khí nổi lên từ miệng hàu: vị trí, cỡ, thời gian và độ trễ khác nhau để không lặp đều như máy. */
const bubbles = [
  { x: 312, r: 3.6, d: 6.4, delay: 0 }, { x: 330, r: 2.4, d: 5.6, delay: 1.7 }, { x: 296, r: 4.4, d: 7.6, delay: 3.1 }, { x: 344, r: 2.8, d: 6.1, delay: 0.8 },
  { x: 322, r: 2, d: 5.2, delay: 4.3 }, { x: 304, r: 3, d: 6.9, delay: 2.4 }, { x: 150, r: 2.4, d: 8.5, delay: 5.2 }, { x: 236, r: 3, d: 9, delay: 6.1 },
] as const;
const rays = ["M150 0 L190 0 L250 400 L170 400Z", "M230 0 L262 0 L360 400 L270 400Z", "M70 0 L98 0 L120 400 L60 400Z"] as const;
/** Gợn mép màng áo của thân hàu (viền sẫm nhăn nheo nhìn thấy ở miệng vỏ). */
const mantle = "M118 256 q9 -13 19 -5 q9 -12 19 -4 q10 -11 21 -3 q10 -10 21 -2 q11 -9 22 -1 q11 -8 22 0 q11 -7 22 1 q10 -5 18 4 q9 -2 14 6";

/**
 * Con hàu hoạt họa của trang đăng nhập: vỏ hàu nhám với các vòng sinh trưởng, hé mở như đang thở (chu kỳ 10 giây) để lộ thân hàu
 * bóng ẩm đập nhẹ, kèm bọt khí, gợn sóng, tia sáng xuyên nước và nghiêng nhẹ theo con trỏ chuột (thị sai theo từng lớp).
 * Thuần trang trí (aria-hidden). Tắt hoàn toàn chuyển động khi người dùng bật "giảm chuyển động".
 */
export function AnimatedOyster() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, px = 0, py = 0;
    const apply = () => { frame = 0; el.style.setProperty("--px", px.toFixed(3)); el.style.setProperty("--py", py.toFixed(3)); };
    const move = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply); // gộp theo khung hình, không tính lại mỗi sự kiện
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); if (frame) cancelAnimationFrame(frame); };
  }, []);

  return (
    <div ref={root} className={s.root} aria-hidden="true">
      <div className={s.glow} />
      <svg className={s.svg} viewBox="0 0 400 400" fill="none">
        <defs>
          <linearGradient id="oy-shell" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e2dac3" /><stop offset=".55" stopColor="#b9af93" /><stop offset="1" stopColor="#8d8570" /></linearGradient>
          <linearGradient id="oy-shell-low" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cfc6ab" /><stop offset="1" stopColor="#8a826c" /></linearGradient>
          <linearGradient id="oy-nacre" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e9eef0" /><stop offset=".5" stopColor="#c9d4d6" /><stop offset="1" stopColor="#bdb4cf" /></linearGradient>
          <radialGradient id="oy-meat" cx=".4" cy=".25" r=".9"><stop offset="0" stopColor="#fbf3e0" /><stop offset=".6" stopColor="#e6d9b9" /><stop offset="1" stopColor="#c4b48d" /></radialGradient>
          <linearGradient id="oy-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8be8d8" stopOpacity=".22" /><stop offset="1" stopColor="#8be8d8" stopOpacity="0" /></linearGradient>
        </defs>

        <g className={s.rays}>{rays.map((d, i) => <path key={d} d={d} fill="url(#oy-ray)" className={s.ray} style={{ animationDelay: `${i * 2.2}s` }} />)}</g>
        <g className={s.ripples}>{[0, 1, 2].map((i) => <ellipse key={i} cx="215" cy="352" rx="110" ry="14" className={s.ripple} style={{ animationDelay: `${i * 1.6}s` }} />)}</g>

        <g className={s.float}>
          <ellipse cx="215" cy="338" rx="130" ry="10" fill="#000" opacity=".28" />
          {/* Dáng hàu nằm ngang, dẹp và thanh thoát: kéo dài chiều ngang, ép chiều cao rồi nghiêng nhẹ quanh tâm. */}
          <g transform="rotate(-7 215 262) translate(215 262) scale(1.18 0.86) translate(-215 -262)">
            {/* Vỏ dưới: lòng vỏ xà cừ, mép lởm chởm */}
            <path d="M88 252C90 276 124 304 172 314c11 3 19-1 27 1 22 7 50 9 72 2 11-4 20 1 30-4 26-12 45-34 40-62-3-12-14-18-30-22-60-8-150-6-223 23Z" fill="url(#oy-shell-low)" stroke="#5f594a" strokeOpacity=".55" strokeWidth="2" strokeLinejoin="round" />
            <g className={s.cavity}>
            <path d="M108 256C140 244 250 240 326 256c4 20-14 40-44 48-30 8-70 8-100-2-40-10-72-24-74-46Z" fill="url(#oy-nacre)" />
            <path d="M118 296c40 18 108 24 160 6M136 312c30 10 80 12 118 0" stroke="#5f594a" strokeOpacity=".28" strokeWidth="2.2" strokeLinecap="round" />
            {/* Thân hàu: bóng ẩm, đập nhẹ khi vỏ mở */}
            <g className={s.meat}>
              <path d="M118 258c34-14 130-18 206-2 8 22-22 42-60 46-38 4-90 2-120-12-18-8-26-20-26-32Z" fill="url(#oy-meat)" />
              <path d={mantle} stroke="#6b6552" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M150 278c40 8 110 8 150-6M158 292c36 6 96 6 128-4" stroke="#a79a76" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="196" cy="268" rx="26" ry="7" fill="#fff" opacity=".7" className={s.shine} transform="rotate(-6 196 268)" />
            </g>
            </g>
            {/* Vỏ trên            {/* Vỏ trên: nhám, các vòng sinh trưởng đồng tâm; xoay mở quanh bản lề (đầu nhọn bên trái) */}
            <g className={s.lid}>
              <path d="M88 252c-8-30 14-74 58-94 20-9 42-14 68-16 24-2 50 0 72 8 11 4 14-2 26 6 18 12 28 34 26 62-4 14-18 18-34 14C238 224 146 226 88 252Z" fill="url(#oy-shell)" stroke="#5f594a" strokeOpacity=".6" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M104 242c4-26 26-52 58-64 24-8 52-9 80-6M126 240c6-22 28-42 56-50 22-6 48-6 74-2M152 238c8-18 28-32 52-38 20-4 42-3 62 2M182 236c10-14 26-24 46-28 16-3 32-2 46 2" stroke="#5f594a" strokeOpacity=".5" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M96 226c8-8 18-12 30-12M150 170c10-6 22-8 34-6M236 148c12 0 22 2 32 6M306 188c6 6 9 12 9 20M268 220c10 0 20-2 28-8M200 214c8-3 16-4 24-3" stroke="#f0e9d4" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M112 236c30-22 96-34 188-14" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>
        </g>

        <g className={s.bubbles}>{bubbles.map((b) => <circle key={b.x} cx={b.x} cy="236" r={b.r} className={s.bubble} style={{ animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` }} />)}</g>
      </svg>
    </div>
  );
}
