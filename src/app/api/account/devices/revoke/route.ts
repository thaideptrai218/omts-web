import { handleDeviceSessions } from "@/server/workspace/device-sessions-http";
export const POST = (request: Request) => handleDeviceSessions(request, "revoke");
