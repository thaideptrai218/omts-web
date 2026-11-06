import type { SVGProps } from "react";

/** Compact oyster and pearl mark inspired by the supplied visual reference. */
export function OysterMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" {...props}>
      <path
        d="M4.5 18.5C6 10 13.5 5.5 22 6.5c5.5.6 9.7 4 12 8.8-2.7-.7-4.5.6-5.5 2.4-2.7-.8-4.5.6-5.4 2.8-2.5-1-4.7.2-5.8 2.2-2.7-1-5.1.1-6.3 2.2-2.3-.3-4.5.4-6.5 2.1-.5-3.2-.5-5.8 0-8.5Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 25c.6 2.1 2 3.4 4.3 3.6 1.3 2.7 3.8 3.5 6.7 2.3 1.4 2.6 4.1 3.2 6.3 1.8 2.2 2.5 4.8 1.8 6-1 2.9.4 5.3-.7 6.5-3.3 2.4-.2 4.1-1.8 4.6-4.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 19c5-7 12-9 20-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".65" />
      <circle cx="20" cy="26" r="4.3" fill="currentColor" />
    </svg>
  );
}
