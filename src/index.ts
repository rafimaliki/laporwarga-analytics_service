import { Hono } from "hono";
import { errorMiddleware } from "@/middlewares/error.middleware";
import { loggerMiddleware } from "@/middlewares/logger.middleware";
import { corsMiddleware } from "@/middlewares/cors.middleware";

import { apiRoutes } from "./routes";

const app = new Hono();

app.use(corsMiddleware);
app.use(loggerMiddleware);
app.use(errorMiddleware);

app.get("/", (c) => c.json({ message: "Hello from Analytics Service!" }));
app.route("/api", apiRoutes);

export default app;
