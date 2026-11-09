// Biểu tượng nhỏ cho trang nguồn gốc; luôn đi kèm chữ nên aria-hidden.
type IconProps = { size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false });

export const ShieldCheckIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const UndoIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
);
export const PinIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const AlertIcon = ({ size = 24 }: IconProps) => (
  <svg {...base(size)}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4" /><path d="M12 17.5h.01" /></svg>
);
export const QrIcon = ({ size = 24 }: IconProps) => (
  <svg {...base(size)}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v3" /></svg>
);
export const ExternalIcon = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
