import type { Context } from "hono";
import { reportsService } from "@/services/report.service";
import { ingestReport } from "@/services/etl.service";

export const etlHandler = {
  run: async (c: Context) => {
    try {
      console.log("Fetching reports...");
      const reports = (await reportsService.list()) as any[];

      for (const report of reports) {
        await ingestReport(report);
      }

      console.log(`ETL completed for ${reports.length} reports`);
      return c.json({
        message: "ETL process finished",
        processed: reports.length,
      });
    } catch (error) {
      console.error(error);
      return c.json(
        { error: "ETL process failed", detail: String(error) },
        500
      );
    }
  },
};
