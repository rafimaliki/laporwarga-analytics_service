import type { Context, Next } from "hono";

export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};
