// Account the page was rendered for. The BFF compares it with the account of the session cookie and
// refuses the request when another tab has since signed in as someone else.
export const DISPLAYED_ACCOUNT_HEADER = "X-OMTS-Account";
// Set on a 401 that the BFF produced before any handler ran or any backend call was made, which makes
// a retry after a token refresh safe even for writes.
export const AUTH_REJECTION_HEADER = "X-OMTS-Auth-Rejected";
export const AUTH_REJECTION_BEFORE_EXECUTION = "before-execution";
// Same header, set by the BFF when the page belongs to an account that is no longer the signed-in one.
export const AUTH_REJECTION_RELOAD_REQUIRED = "reload-required";
