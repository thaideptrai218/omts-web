"use client";

import { useEffect, useRef } from "react";

/**
 * Theo dõi con trỏ trong khối hero cha và ghi toạ độ vào biến CSS --mx/--my.
 * CSS dùng hai biến này để rọi sáng mặt bằng bè quanh con trỏ. Không render gì ra màn hình.
 * Bỏ qua khi người dùng bật giảm chuyển động; màn cảm ứng không có con trỏ nên giữ nguyên trạng thái tĩnh.
 */
export function HeroPointerLight() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hero = marker.current?.parentElement;
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", `${e.clientX - box.left}px`);
        hero.style.setProperty("--my", `${e.clientY - box.top}px`);
      });
    };
    const leave = () => {
      hero.style.setProperty("--mx", "-999px");
      hero.style.setProperty("--my", "-999px");
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <span ref={marker} hidden />;
}
