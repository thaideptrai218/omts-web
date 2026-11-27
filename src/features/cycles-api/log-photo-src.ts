/** Where the browser reads photo `index` of a care log: the BFF streams it (the backend's signed links are not reachable from the browser). */
export const logPhotoSrc = (logId: string, zoneId: string, index: number) => `/api/operations/cultivation-cycles?action=log-photo&id=${logId}&zoneId=${encodeURIComponent(zoneId)}&index=${index}`;
