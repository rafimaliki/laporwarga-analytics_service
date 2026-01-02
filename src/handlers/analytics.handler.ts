import type { Context } from "hono";
import { analyticsService } from "@/services/analytics.service";
import type { DateRangeParams } from "@/types/analytics.types";

// ============================================
// Helper: Parse Query Params
// ============================================

function parseDateParams(c: Context): DateRangeParams {
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  return {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
}

// ============================================
// Handlers
// ============================================

export const analyticsHandler = {
  /**
   * GET /api/analytics/ranking
   * Returns agency performance ranking
   */
  getRanking: async (c: Context) => {
    try {
      const params = parseDateParams(c);
      const data = await analyticsService.getRanking(params);
      return c.json(data);
    } catch (error) {
      console.error("Error fetching ranking:", error);
      return c.json(
        { error: "Failed to fetch ranking data", message: String(error) },
        500
      );
    }
  },

  /**
   * GET /api/analytics/heatmap
   * Returns heatmap data for problem areas
   */
  getHeatmap: async (c: Context) => {
    try {
      const params = parseDateParams(c);
      const data = await analyticsService.getHeatmap(params);
      return c.json(data);
    } catch (error) {
      console.error("Error fetching heatmap:", error);
      return c.json(
        { error: "Failed to fetch heatmap data", message: String(error) },
        500
      );
    }
  },

  /**
   * GET /api/analytics/escalation
   * Returns escalation and rejection statistics
   */
  getEscalation: async (c: Context) => {
    try {
      const params = parseDateParams(c);
      const data = await analyticsService.getEscalation(params);
      return c.json(data);
    } catch (error) {
      console.error("Error fetching escalation:", error);
      return c.json(
        { error: "Failed to fetch escalation data", message: String(error) },
        500
      );
    }
  },

  /**
   * GET /api/analytics/overview
   * Returns dashboard overview statistics
   */
  getOverview: async (c: Context) => {
    try {
      const params = parseDateParams(c);
      const data = await analyticsService.getOverview(params);
      return c.json(data);
    } catch (error) {
      console.error("Error fetching overview:", error);
      return c.json(
        { error: "Failed to fetch overview data", message: String(error) },
        500
      );
    }
  },
  /**
   * GET /api/analytics/sla-compliance
   * Returns SLA compliance statistics
   */
  getSLACompliance: async (c: Context) => {
    const params: DateRangeParams = {
      startDate: c.req.query("startDate"),
      endDate: c.req.query("endDate"),
    };
    const result = await analyticsService.getSLACompliance(params);
    return c.json(result);
  },
  /**
   * GET /api/analytics/mttr-by-type
   * Returns MTTR by type statistics
   */
  getMTTRByType: async (c: Context) => {
    const params: DateRangeParams = {
      startDate: c.req.query("startDate"),
      endDate: c.req.query("endDate"),
    };
    const result = await analyticsService.getMTTRByType(params);
    return c.json(result);
  },
  /**
   * GET /api/analytics/report-type-distribution
   * Returns report type distribution statistics
   */
  getReportTypeDistribution: async (c: Context) => {
    const params: DateRangeParams = {
      startDate: c.req.query("startDate"),
      endDate: c.req.query("endDate"),
    };
    const result = await analyticsService.getReportTypeDistribution(params);
    return c.json(result);
  },

  getRecentReports: async (c: Context) => {
    try {
      const limit = parseInt(c.req.query("limit") || "10", 10);
      const data = await analyticsService.getRecentReports(limit);
      return c.json(data);
    } catch (error) {
      console.error("Error fetching recent reports:", error);
      return c.json(
        { error: "Failed to fetch recent reports", message: String(error) },
        500
      );
    }
  },
};
