import { handleCooperativeRequest } from "@/server/workspace/cooperative-http";
export const GET = (request: Request) => handleCooperativeRequest(request);
export const PUT = GET;
