import {
  pgTable,
  uuid,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* =========================================================
   DIMENSIONS
   ========================================================= */

/**
 * Dimension: Report Type
 * Enum-like dimension derived from ReportType union.
 */
export const dimReportType = pgTable(
  "dim_report_type",
  {
    reportTypeId: serial("report_type_id").primaryKey(),
    name: text("name").notNull(),
  },
  (t) => ({
    uqName: uniqueIndex("uq_dim_report_type_name").on(t.name),
  })
);

/**
 * Dimension: Visibility
 * Enum-like dimension derived from Visibility union.
 */
export const dimVisibility = pgTable(
  "dim_visibility",
  {
    visibilityId: serial("visibility_id").primaryKey(),
    name: text("name").notNull(),
  },
  (t) => ({
    uqName: uniqueIndex("uq_dim_visibility_name").on(t.name),
  })
);

/**
 * Dimension: Status
 * Canonical lifecycle statuses.
 */
export const dimStatus = pgTable(
  "dim_status",
  {
    statusId: serial("status_id").primaryKey(),
    name: text("name").notNull(),
  },
  (t) => ({
    uqName: uniqueIndex("uq_dim_status_name").on(t.name),
  })
);

/**
 * Dimension: Actor Role
 * Enum-like dimension derived from ActorRole union.
 */
export const dimActorRole = pgTable(
  "dim_actor_role",
  {
    actorRoleId: serial("actor_role_id").primaryKey(),
    name: text("name").notNull(),
  },
  (t) => ({
    uqName: uniqueIndex("uq_dim_actor_role_name").on(t.name),
  })
);

/**
 * Dimension: Reporter
 * Sanitized reporter identity (PII excluded).
 */
export const dimReporter = pgTable("dim_reporter", {
  reporterId: uuid("reporter_id").primaryKey(),
  name: text("name").notNull(),
});

/**
 * Dimension: Authority
 * Responsible agency/unit handling the report.
 */
export const dimAuthority = pgTable("dim_authority", {
  authorityId: serial("authority_id").primaryKey(),
  agency: text("agency"),
  unit: text("unit"),
  officerId: uuid("officer_id"),
});

/**
 * Dimension: City
 * Indonesian cities with real coordinates for heatmap and analytics.
 */
export const dimCity = pgTable(
  "dim_city",
  {
    cityId: serial("city_id").primaryKey(),
    name: text("name").notNull(),
    province: text("province").notNull(),
    centerLat: doublePrecision("center_lat").notNull(),
    centerLng: doublePrecision("center_lng").notNull(),
  },
  (t) => ({
    uqName: uniqueIndex("uq_dim_city_name").on(t.name),
  })
);

/* =========================================================
   FACT TABLES
   ========================================================= */

/**
 * Fact: Reports (CORE FACT)
 * Grain: 1 row = 1 report
 */
export const factReports = pgTable("fact_reports", {
  reportId: uuid("report_id").primaryKey(),

  reportTypeId: integer("report_type_id")
    .references(() => dimReportType.reportTypeId)
    .notNull(),

  visibilityId: integer("visibility_id")
    .references(() => dimVisibility.visibilityId)
    .notNull(),

  currentStatusId: integer("current_status_id")
    .references(() => dimStatus.statusId)
    .notNull(),

  authorityId: integer("authority_id").references(
    () => dimAuthority.authorityId
  ),

  cityId: integer("city_id").references(() => dimCity.cityId),

  title: text("title"),
  description: text("description"),

  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  address: text("address"),

  createdAt: timestamp("created_at").notNull(),

  upvoteCount: integer("upvote_count").notNull().default(0),
  isEscalated: boolean("is_escalated").notNull().default(false),
});

/**
 * Bridge: Report ↔ Reporter
 * Keeps privacy and allows future multi-reporter support.
 */
export const bridgeReportReporter = pgTable(
  "bridge_report_reporter",
  {
    reportId: uuid("report_id")
      .references(() => factReports.reportId)
      .notNull(),
    reporterId: uuid("reporter_id")
      .references(() => dimReporter.reporterId)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.reportId, t.reporterId] }),
  })
);

/**
 * Fact: Status Events
 * Grain: 1 row = 1 status transition.
 */
export const factStatusEvents = pgTable("fact_status_events", {
  statusEventId: serial("status_event_id").primaryKey(),

  reportId: uuid("report_id")
    .references(() => factReports.reportId)
    .notNull(),

  statusId: integer("status_id")
    .references(() => dimStatus.statusId)
    .notNull(),

  actorRoleId: integer("actor_role_id")
    .references(() => dimActorRole.actorRoleId)
    .notNull(),

  actorId: uuid("actor_id"),
  note: text("note"),
  eventTimestamp: timestamp("event_timestamp").notNull(),
});

/**
 * Fact: Media Events
 * Grain: 1 row = 1 uploaded media item.
 */
export const factMediaEvents = pgTable("fact_media_events", {
  mediaId: uuid("media_id").primaryKey(),

  reportId: uuid("report_id")
    .references(() => factReports.reportId)
    .notNull(),

  mediaType: text("media_type").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull(),
});

/**
 * Fact: Vote Events
 * Grain: 1 row = 1 upvote by 1 user on 1 report.
 */
export const factVoteEvents = pgTable(
  "fact_vote_events",
  {
    reportId: uuid("report_id")
      .references(() => factReports.reportId)
      .notNull(),
    voterId: uuid("voter_id").notNull(),
    votedAt: timestamp("voted_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.reportId, t.voterId] }),
  })
);

/**
 * Fact: Escalation Events
 * Grain: 1 row = 1 escalation action.
 */
export const factEscalationEvents = pgTable("fact_escalation_events", {
  escalationEventId: serial("escalation_event_id").primaryKey(),

  reportId: uuid("report_id")
    .references(() => factReports.reportId)
    .notNull(),

  escalatedTo: text("escalated_to"),
  reason: text("reason"),
  escalatedAt: timestamp("escalated_at"),
});
