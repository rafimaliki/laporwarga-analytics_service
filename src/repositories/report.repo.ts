import { db, pgClient } from "@/db/index";
import {
  factReports,
  factStatusEvents,
  factEscalationEvents,
  dimStatus,
  dimReportType,
  dimCity,
} from "@/db/schema";
import { eq, sql, and, gte, lte, count, avg } from "drizzle-orm";

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// Heatmap Query
// ============================================

export interface HeatmapRow {
  reportId: string;
  latitude: number | null;
  longitude: number | null;
  reportType: string;
  upvoteCount: number;
  cityName: string | null;
  province: string | null;
}

export async function getHeatmapData(
  filter: DateRangeFilter
): Promise<HeatmapRow[]> {
  const conditions = [];

  if (filter.startDate) {
    conditions.push(gte(factReports.createdAt, filter.startDate));
  }
  if (filter.endDate) {
    conditions.push(lte(factReports.createdAt, filter.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      reportId: factReports.reportId,
      latitude: factReports.latitude,
      longitude: factReports.longitude,
      reportType: dimReportType.name,
      upvoteCount: factReports.upvoteCount,
      cityName: dimCity.name,
      province: dimCity.province,
    })
    .from(factReports)
    .innerJoin(dimReportType, eq(factReports.reportTypeId, dimReportType.reportTypeId))
    .leftJoin(dimCity, eq(factReports.cityId, dimCity.cityId))
    .where(whereClause);

  return rows;
}

// ============================================
// Ranking Query (Agency Performance)
// ============================================

export interface RankingRow {
  agency: string;
  totalReports: number;
  resolvedCount: number;
  avgResolutionHours: number | null;
  slaBreachedCount: number;
}

export async function getRankingData(
  filter: DateRangeFilter
): Promise<RankingRow[]> {
  // Get report counts by status and resolution times
  const SLA_HOURS = 72;

  // Build WHERE clause parts
  const whereParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.startDate) {
    whereParts.push(`fr.created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }
  if (filter.endDate) {
    whereParts.push(`fr.created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
  const andClause = whereParts.length > 0 ? `AND ${whereParts.join(' AND ')}` : '';

  const result = await pgClient.unsafe(`
    WITH report_resolution AS (
      SELECT 
        fr.report_id,
        fr.created_at,
        ds_current.name as current_status,
        -- Find the first "resolved" status event timestamp
        (
          SELECT MIN(fse.event_timestamp)
          FROM fact_status_events fse
          JOIN dim_status ds ON fse.status_id = ds.status_id
          WHERE fse.report_id = fr.report_id AND ds.name = 'resolved'
        ) as resolved_at
      FROM fact_reports fr
      JOIN dim_status ds_current ON fr.current_status_id = ds_current.status_id
      ${whereClause}
    ),
    agency_stats AS (
      SELECT
        COALESCE(
          (SELECT da.agency FROM dim_authority da WHERE da.authority_id = fr.authority_id),
          'Belum Ditugaskan'
        ) as agency,
        COUNT(*) as total_reports,
        COUNT(CASE WHEN rr.current_status = 'resolved' THEN 1 END) as resolved_count,
        AVG(
          CASE 
            WHEN rr.resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (rr.resolved_at - rr.created_at)) / 3600 
          END
        ) as avg_resolution_hours,
        COUNT(
          CASE 
            WHEN rr.resolved_at IS NOT NULL 
            AND EXTRACT(EPOCH FROM (rr.resolved_at - rr.created_at)) / 3600 > $${paramIndex}
            THEN 1 
          END
        ) as sla_breached_count
      FROM fact_reports fr
      JOIN report_resolution rr ON fr.report_id = rr.report_id
      GROUP BY agency
    )
    SELECT * FROM agency_stats
    WHERE agency != 'Belum Ditugaskan'
    ORDER BY total_reports DESC
  `, [...params, SLA_HOURS]);

  return result.map((row: any) => ({
    agency: row.agency,
    totalReports: Number(row.total_reports),
    resolvedCount: Number(row.resolved_count),
    avgResolutionHours: row.avg_resolution_hours ? Number(row.avg_resolution_hours) : null,
    slaBreachedCount: Number(row.sla_breached_count),
  }));
}

// ============================================
// Escalation Stats Query
// ============================================

export interface EscalationRow {
  month: string;
  year: number;
  totalReports: number;
  escalatedCount: number;
  rejectedCount: number;
  resolvedCount: number;
}

export async function getEscalationData(
  filter: DateRangeFilter
): Promise<EscalationRow[]> {
  // Build WHERE clause parts
  const whereParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.startDate) {
    whereParts.push(`fr.created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }
  if (filter.endDate) {
    whereParts.push(`fr.created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await pgClient.unsafe(`
    SELECT
      TO_CHAR(fr.created_at, 'Mon') as month,
      EXTRACT(YEAR FROM fr.created_at) as year,
      EXTRACT(MONTH FROM fr.created_at) as month_num,
      COUNT(*) as total_reports,
      COUNT(CASE WHEN fr.is_escalated = true THEN 1 END) as escalated_count,
      COUNT(CASE WHEN ds.name = 'rejected' THEN 1 END) as rejected_count,
      COUNT(CASE WHEN ds.name = 'resolved' THEN 1 END) as resolved_count
    FROM fact_reports fr
    JOIN dim_status ds ON fr.current_status_id = ds.status_id
    ${whereClause}
    GROUP BY month, year, month_num
    ORDER BY year DESC, month_num DESC
    LIMIT 12
  `, params);

  return result.map((row: any) => ({
    month: row.month,
    year: Number(row.year),
    totalReports: Number(row.total_reports),
    escalatedCount: Number(row.escalated_count),
    rejectedCount: Number(row.rejected_count),
    resolvedCount: Number(row.resolved_count),
  }));
}

// ============================================
// Overview Stats Query
// ============================================

export interface OverviewStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  escalatedReports: number;
  rejectedReports: number;
}

export async function getOverviewStats(
  filter: DateRangeFilter
): Promise<OverviewStats> {
  // Build WHERE clause parts
  const whereParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.startDate) {
    whereParts.push(`fr.created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }
  if (filter.endDate) {
    whereParts.push(`fr.created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await pgClient.unsafe(`
    SELECT
      COUNT(*) as total_reports,
      COUNT(CASE WHEN ds.name IN ('submitted', 'verified', 'in_progress') THEN 1 END) as pending_reports,
      COUNT(CASE WHEN ds.name = 'resolved' THEN 1 END) as resolved_reports,
      COUNT(CASE WHEN fr.is_escalated = true THEN 1 END) as escalated_reports,
      COUNT(CASE WHEN ds.name = 'rejected' THEN 1 END) as rejected_reports
    FROM fact_reports fr
    JOIN dim_status ds ON fr.current_status_id = ds.status_id
    ${whereClause}
  `, params);

  const row = result[0];
  return {
    totalReports: Number(row?.total_reports || 0),
    pendingReports: Number(row?.pending_reports || 0),
    resolvedReports: Number(row?.resolved_reports || 0),
    escalatedReports: Number(row?.escalated_reports || 0),
    rejectedReports: Number(row?.rejected_reports || 0),
  };
}

// ============================================
// SLA Compliance Query
// ============================================

export interface SLAComplianceRow {
  agency: string;
  totalAssignedReports: number;
  slaBreachedCount: number;
  slaComplianceRate: number; // percentage (0-100)
}

export async function getSLAComplianceData(
  filter: DateRangeFilter
): Promise<SLAComplianceRow[]> {
  const SLA_HOURS = 72; // Assumption: 72 hours SLA

  const whereParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.startDate) {
    whereParts.push(`fr.created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }
  if (filter.endDate) {
    whereParts.push(`fr.created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await pgClient.unsafe(`
    WITH report_resolution AS (
      SELECT 
        fr.report_id,
        fr.authority_id,
        fr.created_at,
        (
          SELECT MIN(fse.event_timestamp)
          FROM fact_status_events fse
          JOIN dim_status ds ON fse.status_id = ds.status_id
          WHERE fse.report_id = fr.report_id AND ds.name = 'resolved'
        ) as resolved_at
      FROM fact_reports fr
      ${whereClause}
    ),
    agency_sla AS (
      SELECT
        COALESCE(da.agency, 'Belum Ditugaskan') as agency,
        COUNT(*) as total_assigned,
        COUNT(
          CASE 
            WHEN rr.resolved_at IS NOT NULL 
            AND EXTRACT(EPOCH FROM (rr.resolved_at - rr.created_at)) / 3600 > $${paramIndex}
            THEN 1 
          END
        ) as sla_breached
      FROM report_resolution rr
      LEFT JOIN dim_authority da ON rr.authority_id = da.authority_id
      WHERE rr.authority_id IS NOT NULL
      GROUP BY agency
    )
    SELECT 
      agency,
      total_assigned,
      sla_breached,
      ROUND(((total_assigned - sla_breached)::numeric / NULLIF(total_assigned, 0) * 100), 2) as sla_compliance_rate
    FROM agency_sla
    WHERE agency != 'Belum Ditugaskan'
    ORDER BY sla_compliance_rate DESC
  `, [...params, SLA_HOURS]);

  return result.map((row: any) => ({
    agency: row.agency,
    totalAssignedReports: Number(row.total_assigned),
    slaBreachedCount: Number(row.sla_breached),
    slaComplianceRate: Number(row.sla_compliance_rate || 0),
  }));
}

// ============================================
// MTTR (Mean Time To Resolution) by Type
// ============================================

export interface MTTRByTypeRow {
  reportType: string;
  avgResolutionHours: number | null;
  resolvedCount: number;
  totalCount: number;
}

export async function getMTTRByTypeData(
  filter: DateRangeFilter
): Promise<MTTRByTypeRow[]> {
  const whereParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.startDate) {
    whereParts.push(`fr.created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }
  if (filter.endDate) {
    whereParts.push(`fr.created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await pgClient.unsafe(`
    WITH report_resolution AS (
      SELECT 
        fr.report_id,
        fr.report_type_id,
        fr.created_at,
        (
          SELECT MIN(fse.event_timestamp)
          FROM fact_status_events fse
          JOIN dim_status ds ON fse.status_id = ds.status_id
          WHERE fse.report_id = fr.report_id AND ds.name = 'resolved'
        ) as resolved_at
      FROM fact_reports fr
      ${whereClause}
    )
    SELECT
      drt.name as report_type,
      COUNT(*) as total_count,
      COUNT(rr.resolved_at) as resolved_count,
      AVG(
        CASE 
          WHEN rr.resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (rr.resolved_at - rr.created_at)) / 3600 
        END
      ) as avg_resolution_hours
    FROM report_resolution rr
    JOIN dim_report_type drt ON rr.report_type_id = drt.report_type_id
    GROUP BY drt.name
    ORDER BY avg_resolution_hours ASC NULLS LAST
  `, params);

  return result.map((row: any) => ({
    reportType: row.report_type,
    avgResolutionHours: row.avg_resolution_hours ? Number(row.avg_resolution_hours) : null,
    resolvedCount: Number(row.resolved_count),
    totalCount: Number(row.total_count),
  }));
}

// ============================================
// Distribusi Jenis Masalah (Stacked by Status)
// ============================================

export interface ReportTypeDistributionRow {
  reportType: string;
  submitted: number;
  verified: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  escalated: number;
  total: number;
}

export async function getReportTypeDistributionData(
  filter: DateRangeFilter
): Promise<ReportTypeDistributionRow[]> {
  const whereParts: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filter.startDate) {
    whereParts.push(`fr.created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }
  if (filter.endDate) {
    whereParts.push(`fr.created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const result = await pgClient.unsafe(`
    SELECT
      drt.name as report_type,
      COUNT(*) as total,
      COUNT(CASE WHEN ds.name = 'submitted' THEN 1 END) as submitted,
      COUNT(CASE WHEN ds.name = 'verified' THEN 1 END) as verified,
      COUNT(CASE WHEN ds.name = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN ds.name = 'resolved' THEN 1 END) as resolved,
      COUNT(CASE WHEN ds.name = 'rejected' THEN 1 END) as rejected,
      COUNT(CASE WHEN ds.name = 'escalated' THEN 1 END) as escalated
    FROM fact_reports fr
    JOIN dim_report_type drt ON fr.report_type_id = drt.report_type_id
    JOIN dim_status ds ON fr.current_status_id = ds.status_id
    ${whereClause}
    GROUP BY drt.name
    ORDER BY total DESC
  `, params);

  return result.map((row: any) => ({
    reportType: row.report_type,
    submitted: Number(row.submitted),
    verified: Number(row.verified),
    inProgress: Number(row.in_progress),
    resolved: Number(row.resolved),
    rejected: Number(row.rejected),
    escalated: Number(row.escalated),
    total: Number(row.total),
  }));
}
