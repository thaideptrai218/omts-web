/** Fired on `window` after any write through `bffFetch` succeeded, so screens that show derived figures (the farming journey bar) can re-read. */
export const MUTATION_EVENT = "omts-mutation-succeeded";

export function announceMutation(method: string | undefined, response: Response): void {
  if (typeof window === "undefined" || !response.ok) return;
  const verb = (method ?? "GET").toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") window.dispatchEvent(new Event(MUTATION_EVENT));
}
