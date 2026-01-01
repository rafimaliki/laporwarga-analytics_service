import type {
  RankingData,
  RankingResponse,
  HeatmapPoint,
  HeatmapCluster,
  HeatmapResponse,
  EscalationStats,
  EscalationTrend,
  EscalationResponse,
  DateRangeParams,
} from "@/types/analytics.types";
import {
  getHeatmapData,
  getRankingData,
  getEscalationData,
  getOverviewStats,
  type DateRangeFilter,
} from "@/repositories/report.repo";

// ============================================
// Helper: Convert params to filter
// ============================================

function toDateFilter(params: DateRangeParams): DateRangeFilter {
  return {
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
  };
}

// ============================================
// Type Mapping
// ============================================

const TYPE_MAPPING: Record<string, string> = {
  kriminalitas: "Keamanan",
  kebersihan: "Kebersihan",
  kesehatan: "Pelayanan Publik",
  fasilitas: "Infrastruktur",
  lainnya: "Lainnya",
};

// ============================================
// Ranking Calculation (from DB data)
// ============================================

function calculateRankingFromDb(
  rows: Awaited<ReturnType<typeof getRankingData>>
): RankingData[] {
  const SLA_HOURS = 72;

  const rankingData: RankingData[] = rows.map((row) => {
    const avgResolutionHours = row.avgResolutionHours || 0;

    // Score formula: 100 - (SLA breach rate penalty) - (resolution time penalty)
    const slaBreachRate =
      row.totalReports > 0
        ? (row.slaBreachedCount / row.totalReports) * 100
        : 0;
    const resolutionPenalty = Math.min((avgResolutionHours / SLA_HOURS) * 20, 30);
    const score = Math.max(
      0,
      Math.round(100 - slaBreachRate * 0.3 - resolutionPenalty)
    );

    return {
      rank: 0,
      agencyName: row.agency,
      slaBreachedCount: row.slaBreachedCount,
      avgResolutionTimeHours: Math.round(avgResolutionHours * 10) / 10,
      totalReports: row.totalReports,
      score,
    };
  });

  // Sort by score and assign ranks
  rankingData.sort((a, b) => b.score - a.score);
  rankingData.forEach((item, index) => {
    item.rank = index + 1;
  });

  return rankingData;
}

// ============================================
// Heatmap Calculation (from DB data)
// ============================================

function calculateHeatmapFromDb(
  rows: Awaited<ReturnType<typeof getHeatmapData>>
): HeatmapResponse {
  const points: HeatmapPoint[] = rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => ({
      id: row.reportId,
      latitude: row.latitude!,
      longitude: row.longitude!,
      type: TYPE_MAPPING[row.reportType] || "Lainnya",
      intensity: Math.min(row.upvoteCount / 10, 1),
    }));

  // Simple clustering by grid (~1km)
  const gridSize = 0.01;
  const clusterMap = new Map<string, HeatmapCluster>();

  rows
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .forEach((row) => {
      const gridLat = Math.round(row.latitude! / gridSize) * gridSize;
      const gridLng = Math.round(row.longitude! / gridSize) * gridSize;
      const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
      const type = TYPE_MAPPING[row.reportType] || "Lainnya";

      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          latitude: gridLat,
          longitude: gridLng,
          count: 0,
          types: {},
        });
      }

      const cluster = clusterMap.get(key)!;
      cluster.count++;
      cluster.types[type] = (cluster.types[type] || 0) + 1;
    });

  const clusters = Array.from(clusterMap.values()).filter((c) => c.count > 1);

  return { points, clusters };
}

// ============================================
// Escalation Calculation (from DB data)
// ============================================

function calculateEscalationFromDb(
  rows: Awaited<ReturnType<typeof getEscalationData>>
): EscalationResponse {
  // Calculate totals
  let totalReports = 0;
  let totalEscalated = 0;
  let totalRejected = 0;

  rows.forEach((row) => {
    totalReports += row.totalReports;
    totalEscalated += row.escalatedCount;
    totalRejected += row.rejectedCount;
  });

  const stats: EscalationStats = {
    totalEscalated,
    totalRejected,
    escalationRate:
      totalReports > 0
        ? Math.round((totalEscalated / totalReports) * 1000) / 10
        : 0,
    rejectionRate:
      totalReports > 0
        ? Math.round((totalRejected / totalReports) * 1000) / 10
        : 0,
    totalReports,
  };

  // Map month abbreviations for Indonesian locale
  const monthMap: Record<string, string> = {
    Jan: "Jan",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Apr",
    May: "Mei",
    Jun: "Jun",
    Jul: "Jul",
    Aug: "Agu",
    Sep: "Sep",
    Oct: "Okt",
    Nov: "Nov",
    Dec: "Des",
  };

  // Get last 8 months of trends (already ordered by DB)
  const trends: EscalationTrend[] = rows.slice(0, 8).reverse().map((row) => ({
    period: monthMap[row.month] || row.month,
    escalated: row.escalatedCount,
    rejected: row.rejectedCount,
    resolved: row.resolvedCount,
  }));

  return {
    stats,
    trends,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================
// Exported Service Functions
// ============================================

export const analyticsService = {
  async getRanking(params: DateRangeParams): Promise<RankingResponse> {
    const filter = toDateFilter(params);
    const rows = await getRankingData(filter);
    return {
      data: calculateRankingFromDb(rows),
      updatedAt: new Date().toISOString(),
    };
  },

  async getHeatmap(params: DateRangeParams): Promise<HeatmapResponse> {
    const filter = toDateFilter(params);
    const rows = await getHeatmapData(filter);
    return calculateHeatmapFromDb(rows);
  },

  async getEscalation(params: DateRangeParams): Promise<EscalationResponse> {
    const filter = toDateFilter(params);
    const rows = await getEscalationData(filter);
    return calculateEscalationFromDb(rows);
  },

  async getOverview(params: DateRangeParams) {
    const filter = toDateFilter(params);
    const stats = await getOverviewStats(filter);
    return {
      ...stats,
      updatedAt: new Date().toISOString(),
    };
  },
};
