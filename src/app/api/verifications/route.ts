import { handleVerification } from "@/server/verification/verification-http";
export const POST = (request: Request) => handleVerification(request);
