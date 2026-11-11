"use client";

import { useId, type CSSProperties } from "react";
import { OysterArtwork } from "./oyster-artwork";
import { useOysterMood } from "./oyster-mood";
import s from "./animated-oyster.module.css";

// Staggered negative delays seed a current across the full landscape immediately.
const bubbles = Array.from({ length: 20 }, (_, i) => ({
  x: 28 + i * 26, y: 352 + (i % 3) * 7, r: 1.3 + (i % 5) * .5,
  duration: 5.5 + (i % 7), delay: -1.1 - i * .73, wobble: 12 + (i % 4) * 9,
}));
const particles = [ [45, 105], [130, 293], [250, 70], [360, 325], [480, 153] ];

/** Decorative seafood study. CSS alone supplies the water and hinged-valve motion. */
export function AnimatedOyster() {
  const id = useId();
  const { mood } = useOysterMood();
  return <div className={s.root} aria-hidden="true" data-mood={mood}>
    <svg className={s.svg} viewBox="0 0 600 400" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-water`}>
          <stop className={s.water} stopOpacity=".18"/><stop offset="1" className={s.water} stopOpacity="0"/>
        </radialGradient>
        {/* Soft edges: each beam fades to nothing on both sides so it reads as diffused water light, not a bar. */}
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="0">
          <stop className={s.light} stopOpacity="0"/><stop offset=".5" className={s.light} stopOpacity=".075"/><stop offset="1" className={s.light} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <ellipse cx="300" cy="210" rx="275" ry="180" fill={`url(#${id}-water)`}/>
      <g className={s.rays} fill={`url(#${id}-light)`}>
        <path d="M100 0 120 0 320 365 270 350Z"/><path d="M340 0 350 0 520 330 490 315Z"/>
      </g>
      <g className={s.drift}><OysterArtwork id={id}/></g>
      <g className={s.revealBubbles}>
        <circle cx="224" cy="258" r="24" />
        <circle cx="267" cy="290" r="17" />
        <circle cx="310" cy="254" r="30" />
        <circle cx="355" cy="290" r="18" />
        <circle cx="397" cy="250" r="23" />
      </g>
      <g data-part="bubbles">
        {bubbles.map(({ x, y, r, duration, delay, wobble }) => <circle key={x} cx={x} cy={y} r={r} className={s.bubble} style={{
          animationDuration: `${duration}s`, animationDelay: `${delay}s`, "--wobble": `${wobble}px`,
        } as CSSProperties}/>)}
      </g>
      <g data-part="plankton">
        {particles.map(([x, y], i) => <path key={x} d={`M${x} ${y}h1.5`} className={s.particle} style={{ animationDelay: `${-i * 4}s`, animationDuration: `${19 + i * 2}s` }}/>) }
      </g>
    </svg>
  </div>;
}

