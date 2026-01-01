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
};
