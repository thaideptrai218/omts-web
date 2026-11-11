import type { ComponentProps } from "react";

/**
 * The on/off control of settings panels and filter toolbars: a native checkbox with `role="switch"` (keyboard, form and test behaviour stay native),
 * drawn as a track and knob by `.omts-switch` in globals.css. A disabled switch keeps full strength; a locked "on" shows as a lighter brand colour.
 * Give it an accessible name with `aria-label` or by wrapping it in a `<label>`.
 */
export function Switch({ className = "", ...props }: Omit<ComponentProps<"input">, "type" | "role">) {
  return <input {...props} type="checkbox" role="switch" className={`omts-switch ${className}`.trim()} />;
}
