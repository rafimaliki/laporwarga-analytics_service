import { Hono } from "hono";
import { analyticsHandler } from "@/handlers/analytics.handler";

const analyticsRoutes = new Hono();

// GET /api/analytics/ranking?startDate=&endDate=
analyticsRoutes.get("/ranking", analyticsHandler.getRanking);

// GET /api/analytics/heatmap?startDate=&endDate=
analyticsRoutes.get("/heatmap", analyticsHandler.getHeatmap);

// GET /api/analytics/escalation?startDate=&endDate=
analyticsRoutes.get("/escalation", analyticsHandler.getEscalation);

// GET /api/analytics/overview?startDate=&endDate=
analyticsRoutes.get("/overview", analyticsHandler.getOverview);

export { analyticsRoutes };
