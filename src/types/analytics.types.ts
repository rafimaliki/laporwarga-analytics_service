export type ReportType = "kriminalitas" | "kebersihan" | "kesehatan" | "fasilitas" | "lainnya";
export type Status = "submitted" | "verified" | "in_progress" | "resolved" | "rejected" | "escalated";

export interface RawReport {
  report_id: string;
  type: ReportType;
  title: string;
  description: string;
  visibility: "public" | "private" | "anonymous";
  reporter: {
    user_id: string;
    name: string;
    contact: {
      email: string;
      phone: string;
    };
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  media: Array<{
    media_id: string;
    type: "image" | "video" | "audio";
    url: string;
    uploaded_at: string;
  }>;
  status: {
    current: Status;
    updated_at: string;
  };
  timeline: Array<{
    status: string;
    actor: {
      actor_id: string;
      actor_role: "citizen" | "officer" | "supervisor" | "system";
    };
    note: string;
    timestamp: string;
  }>;
  votes: {
    upvote_count: number;
    voters: string[];
  };
  authority: {
    assigned_agency: string | null;
    assigned_unit: string | null;
    assigned_officer_id: string | null;
  };
  escalation: {
    is_escalated: boolean;
    escalated_to: string | null;
    escalation_reason: string | null;
    escalated_at: string | null;
  };
  created_at: string;
}

// ============================================
// Ranking Widget Types
// ============================================

export interface RankingData {
  rank: number;
  agencyName: string;
  slaBreachedCount: number;
  avgResolutionTimeHours: number;
  totalReports: number;
  score: number;
}

export interface RankingResponse {
  data: RankingData[];
  updatedAt: string;
}

// ============================================
// Heatmap Widget Types
// ============================================

export interface HeatmapPoint {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  intensity: number;
}

export interface HeatmapCluster {
  latitude: number;
  longitude: number;
  count: number;
  types: Record<string, number>;
}

export interface HeatmapResponse {
  points: HeatmapPoint[];
  clusters: HeatmapCluster[];
}

// ============================================
// Escalation Widget Types
// ============================================

export interface EscalationStats {
  totalEscalated: number;
  totalRejected: number;
  escalationRate: number;
  rejectionRate: number;
  totalReports: number;
}

export interface EscalationTrend {
  period: string;
  escalated: number;
  rejected: number;
  resolved: number;
}

export interface EscalationResponse {
  stats: EscalationStats;
  trends: EscalationTrend[];
  updatedAt: string;
}

// ============================================
// Query Parameters
// ============================================

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}
