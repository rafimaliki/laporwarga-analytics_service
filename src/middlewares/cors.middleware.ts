import type { Context, Next } from "hono";

export const corsMiddleware = async (c: Context, next: Next) => {
  const origin = c.req.header("origin") || "http://localhost:3000";

  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  c.header("Access-Control-Max-Age", "3600");

  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }

  await next();
};
