import { handleCooperativeRequest } from "@/server/workspace/cooperative-http";
export const GET = (request: Request) => handleCooperativeRequest(request, true);
export const POST = GET;
export const DELETE = GET;
