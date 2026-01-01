import { Hono } from "hono";
import { metricsRoutes } from "./metric.route";
import { etlRoutes } from "./etl.route";
import { analyticsRoutes } from "./analytics.route";

const apiRoutes = new Hono();

apiRoutes.route("/metrics", metricsRoutes);
apiRoutes.route("/etl", etlRoutes);
apiRoutes.route("/analytics", analyticsRoutes);

export { apiRoutes };
