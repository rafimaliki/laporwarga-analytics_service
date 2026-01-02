import { Hono } from "hono";
import { etlRoutes } from "./etl.route";
import { analyticsRoutes } from "./analytics.route";

const apiRoutes = new Hono();

apiRoutes.route("/etl", etlRoutes);
apiRoutes.route("/analytics", analyticsRoutes);

export { apiRoutes };
