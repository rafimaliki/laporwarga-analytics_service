import { Hono } from "hono";
import { metricsRoutes } from "./metric.route";
import { etlRoutes } from "./etl.route";

const apiRoutes = new Hono();

apiRoutes.route("/metrics", metricsRoutes);
apiRoutes.route("/etl", etlRoutes);

export { apiRoutes };
