import { Hono } from "hono";
import { metricsRoutes } from "./metric.route";

const apiRoutes = new Hono();

apiRoutes.route("/metrics", metricsRoutes);

export { apiRoutes };
