import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(async (request: Request) => {
  const auth = await getAuth();
  return auth.handler(request);
});
