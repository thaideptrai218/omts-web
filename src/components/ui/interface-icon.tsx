import type { SVGProps } from "react";

const paths = {
  palette: "M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.8-.3-1 .4-2.2 1.6-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10ZM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  "panel-close": "M3 4h18v16H3V4ZM9 4v16m8-12-4 4 4 4",
  "panel-open": "M3 4h18v16H3V4ZM9 4v16m4-12 4 4-4 4",
  menu: "M4 6h16M4 12h16M4 18h16",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  list: "M5 6h1m4 0h9M5 12h1m4 0h9M5 18h1m4 0h9",
  logout: "M9 4H4v16h5m6-12 4 4-4 4M8 12h11",
  raft: "M3 5h18M3 10h18M3 15h18M6 3v14M12 3v14M18 3v14M2 21c3-3 5 3 10 0s7 3 10 0",
  dashboard: "M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z",
  "id-card":
    "M3 5h18v14H3V5ZM8 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 16c0-3 6-3 6 0M14 9h4M14 13h4",
  settings:
    "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  calendar: "M4 5h16v16H4V5ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2",
  document: "M5 3h9l5 5v13H5V3ZM14 3v6h5M8 13h8M8 17h6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  account: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  roles: "m12 3 9 4-9 4-9-4 9-4ZM3 12l9 4 9-4M3 17l9 4 9-4",
  zone: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  search: "m21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  add: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-up": "m6 15 6-6 6 6",
  "chevron-left": "m15 6-6 6 6 6",
  first: "M6 5v14m12-1-6-6 6-6",
  last: "M18 5v14M6 18l6-6-6-6",
  sort: "M8 10l4-4 4 4M8 14l4 4 4-4",
  upload: "M12 16V5m-4 4 4-4 4 4M4 19h16",
  download: "M12 5v11m-4-4 4 4 4-4M4 19h16",
  columns: "M4 5h16v14H4V5Zm5 0v14m6-14v14",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7m0 3.5v.5",
  "chevron-right": "m9 6 6 6-6 6",
  refresh:
    "M20 7v5h-5M4 17v-5h5M6.1 6.1a8 8 0 0 1 13.5 3.4M4.4 14.5a8 8 0 0 0 13.5 3.4",
  link: "m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M13 17a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1",
  lock: "M5 11h14v10H5V11ZM8 11V7a4 4 0 0 1 8 0v4M12 15v2",
  pencil: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z",
  check: "m5 12 4 4L19 6",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  close: "M6 6l12 12M18 6 6 18",
  user: "M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  waves:
    "M2 7c3-4 5 4 10 0s7 4 10 0M2 12c3-4 5 4 10 0s7 4 10 0M2 17c3-4 5 4 10 0s7 4 10 0",
  attendance: "M4 4h16v16H4V4Zm0 5h16M8 2v4m8-4v4m-8 8 2.5 2.5L16 11",
  employee: "M7 20v-2a5 5 0 0 1 10 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 20h18",
  receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm3 5h8m-8 4h8m-8 4h4",
  payment: "M3 7h18v11H3V7Zm0 4h18M7 15h4M7 4h10",
  cooperative: "M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M7 11h2m6 0h2",
  supplier: "M3 6h11v11H3V6Zm11 4h4l3 4v3h-7m-8 0a2 2 0 1 0 4 0m8 0a2 2 0 1 0 4 0",
  material: "M3 7.5 12 3l9 4.5-9 4.5-9-4.5Zm0 0V17l9 4 9-4V7.5M12 12v9",
  water: "M12 2c3 5 7 9 7 13a7 7 0 0 1-14 0c0-4 4-8 7-13Zm-4 13a4 4 0 0 0 4 4",
  product: "M4 4h9l7 7-9 9-7-7V4Zm4 4h.01",
  request: "M7 3h10v3H7V3ZM5 5H3v16h18V5h-2M7 12h10m-10 4h7",
  inbox: "M4 4h16v12h-5l-2 3h-2l-2-3H4V4Zm4 5h8m-8 3h5",
  security: "M12 2 4 6v6c0 5 3.3 8.2 8 10 4.7-1.8 8-5 8-10V6l-8-4Zm-3 10 2 2 4-4",
  work: "M4 5h16v16H4V5Zm4-2v4m8-4v4M7 12h4m-4 4h7m1-4 1 1 2-2",
} as const;

export type InterfaceIconName = keyof typeof paths;

export function InterfaceIcon({
  name,
  className = "size-5",
  ...props
}: SVGProps<SVGSVGElement> & { name: InterfaceIconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
