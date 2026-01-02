import { Hono } from "hono";
import { etlHandler } from "@/handlers/etl.handler";

const etlRoutes = new Hono();

// POST /api/etl/run
etlRoutes.post("/run", etlHandler.run);

export { etlRoutes };
