import type {
  RawReport,
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

// ============================================
// Report Service Client
// ============================================

async function fetchReports(): Promise<RawReport[]> {
  const response = await fetch(`${process.env.REPORT_SERVICE_URL}/reports/list`);
  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.statusText}`);
  }
  return response.json();
}

// ============================================
// Date Filtering Helper
// ============================================

function filterByDateRange(reports: RawReport[], params: DateRangeParams): RawReport[] {
  let filtered = reports;

  if (params.startDate) {
    const start = new Date(params.startDate);
    filtered = filtered.filter((r) => new Date(r.created_at) >= start);
  }

  if (params.endDate) {
    const end = new Date(params.endDate);
    filtered = filtered.filter((r) => new Date(r.created_at) <= end);
  }

  return filtered;
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
// Ranking Calculation
// ============================================

function calculateRankingData(reports: RawReport[]): RankingData[] {
  const SLA_HOURS = 72;

  // Group by agency
  const agencyMap = new Map<
    string,
    {
      totalReports: number;
      resolvedReports: number;
      totalResolutionHours: number;
      slaBreached: number;
    }
  >();

  reports.forEach((report) => {
    const agency = report.authority.assigned_agency || "Belum Ditugaskan";

    if (!agencyMap.has(agency)) {
      agencyMap.set(agency, {
        totalReports: 0,
        resolvedReports: 0,
        totalResolutionHours: 0,
        slaBreached: 0,
      });
    }

    const stats = agencyMap.get(agency)!;
    stats.totalReports++;

    // Calculate resolution time if resolved
    if (report.status.current === "resolved") {
      stats.resolvedReports++;
      const created = new Date(report.created_at);
      const resolved = new Date(report.status.updated_at);
      const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
      stats.totalResolutionHours += hours;

      if (hours > SLA_HOURS) {
        stats.slaBreached++;
      }
    }
  });

  // Calculate scores and create ranking
  const rankingData: RankingData[] = [];

  agencyMap.forEach((stats, agencyName) => {
    if (agencyName === "Belum Ditugaskan") return;

    const avgResolutionHours =
      stats.resolvedReports > 0
        ? stats.totalResolutionHours / stats.resolvedReports
        : 0;

    // Score formula: 100 - (SLA breach rate penalty) - (resolution time penalty)
    const slaBreachRate =
      stats.totalReports > 0
        ? (stats.slaBreached / stats.totalReports) * 100
        : 0;
    const resolutionPenalty = Math.min((avgResolutionHours / SLA_HOURS) * 20, 30);
    const score = Math.max(
      0,
      Math.round(100 - slaBreachRate * 0.3 - resolutionPenalty)
    );

    rankingData.push({
      rank: 0,
      agencyName,
      slaBreachedCount: stats.slaBreached,
      avgResolutionTimeHours: Math.round(avgResolutionHours * 10) / 10,
      totalReports: stats.totalReports,
      score,
    });
  });

  // Sort by score and assign ranks
  rankingData.sort((a, b) => b.score - a.score);
  rankingData.forEach((item, index) => {
    item.rank = index + 1;
  });

  return rankingData;
}

// ============================================
// Heatmap Calculation
// ============================================

function calculateHeatmapData(reports: RawReport[]): HeatmapResponse {
  const points: HeatmapPoint[] = reports.map((report) => ({
    id: report.report_id,
    latitude: report.location.latitude,
    longitude: report.location.longitude,
    type: TYPE_MAPPING[report.type] || "Lainnya",
    intensity: Math.min(report.votes.upvote_count / 10, 1),
  }));

  // Simple clustering by grid (~1km)
  const gridSize = 0.01;
  const clusterMap = new Map<string, HeatmapCluster>();

  reports.forEach((report) => {
    const gridLat = Math.round(report.location.latitude / gridSize) * gridSize;
    const gridLng = Math.round(report.location.longitude / gridSize) * gridSize;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
    const type = TYPE_MAPPING[report.type] || "Lainnya";

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
// Escalation Calculation
// ============================================

function calculateEscalationData(reports: RawReport[]): EscalationResponse {
  const totalReports = reports.length;
  let totalEscalated = 0;
  let totalRejected = 0;

  // Monthly trends
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthlyData = new Map<string, { escalated: number; rejected: number; resolved: number }>();

  reports.forEach((report) => {
    const date = new Date(report.created_at);
    const monthKey = months[date.getMonth()];

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { escalated: 0, rejected: 0, resolved: 0 });
    }

    const monthStats = monthlyData.get(monthKey)!;

    if (report.escalation.is_escalated) {
      totalEscalated++;
      monthStats.escalated++;
    }

    if (report.status.current === "rejected") {
      totalRejected++;
      monthStats.rejected++;
    }

    if (report.status.current === "resolved") {
      monthStats.resolved++;
    }
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

  // Get last 8 months of trends
  const currentMonth = new Date().getMonth();
  const trends: EscalationTrend[] = [];

  for (let i = 7; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const monthKey = months[monthIndex];
    const data = monthlyData.get(monthKey) || { escalated: 0, rejected: 0, resolved: 0 };
    trends.push({
      period: monthKey,
      ...data,
    });
  }

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
    const reports = await fetchReports();
    const filtered = filterByDateRange(reports, params);
    return {
      data: calculateRankingData(filtered),
      updatedAt: new Date().toISOString(),
    };
  },

  async getHeatmap(params: DateRangeParams): Promise<HeatmapResponse> {
    const reports = await fetchReports();
    const filtered = filterByDateRange(reports, params);
    return calculateHeatmapData(filtered);
  },

  async getEscalation(params: DateRangeParams): Promise<EscalationResponse> {
    const reports = await fetchReports();
    const filtered = filterByDateRange(reports, params);
    return calculateEscalationData(filtered);
  },
};
