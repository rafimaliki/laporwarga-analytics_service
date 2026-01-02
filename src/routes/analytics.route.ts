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

// GET /api/analytics/sla-compliance?startDate=&endDate=
analyticsRoutes.get("/sla-compliance", analyticsHandler.getSLACompliance);

// GET /api/analytics/mttr-by-type?startDate=&endDate=
analyticsRoutes.get("/mttr-by-type", analyticsHandler.getMTTRByType);

// GET /api/analytics/report-type-distribution?startDate=&endDate=
analyticsRoutes.get(
  "/report-type-distribution",
  analyticsHandler.getReportTypeDistribution
);

// GET /api/analytics/recent-reports?count=
analyticsRoutes.get("/recent-reports", analyticsHandler.getRecentReports);

export { analyticsRoutes };
