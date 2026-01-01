import { Hono } from "hono";
import { etlHandler } from "@/handlers/etl.handler";

const etlRoutes = new Hono();

etlRoutes.post("/run", etlHandler.list);

export { etlRoutes };
