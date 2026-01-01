import { db } from "@/db/index";
import {
  factReports,
  dimReporter,
  bridgeReportReporter,
  factStatusEvents,
  factMediaEvents,
  factVoteEvents,
  factEscalationEvents,
} from "@/db/schema";
import {
  lookupReportTypeId,
  lookupVisibilityId,
  lookupStatusId,
  lookupActorRoleId,
} from "@/db/lookups";

export async function ingestReport(report: any) {
  await db.transaction(async (tx) => {
    // -----------------------------
    // Dimension lookups
    // -----------------------------
    const reportTypeId = await lookupReportTypeId(report.type);
    const visibilityId = await lookupVisibilityId(report.visibility);
    const currentStatusId = await lookupStatusId(report.status.current);

    // -----------------------------
    // Reporter (UPSERT)
    // -----------------------------
    await tx
      .insert(dimReporter)
      .values({
        reporterId: report.reporter.user_id,
        name: report.reporter.name,
      })
      .onConflictDoNothing();

    // -----------------------------
    // Fact: Reports (UPSERT)
    // -----------------------------
    await tx
      .insert(factReports)
      .values({
        reportId: report.report_id,
        reportTypeId,
        visibilityId,
        currentStatusId,
        title: report.title,
        description: report.description,
        latitude: report.location.latitude,
        longitude: report.location.longitude,
        address: report.location.address,
        createdAt: new Date(report.created_at),
        upvoteCount: report.votes.upvote_count,
        isEscalated: report.escalation.is_escalated,
      })
      .onConflictDoNothing();

    // -----------------------------
    // Bridge: Report <-> Reporter
    // -----------------------------
    await tx
      .insert(bridgeReportReporter)
      .values({
        reportId: report.report_id,
        reporterId: report.reporter.user_id,
      })
      .onConflictDoNothing();

    // -----------------------------
    // Status Timeline
    // -----------------------------
    for (const event of report.timeline) {
      const statusId = await lookupStatusId(event.status);
      const actorRoleId = await lookupActorRoleId(event.actor.actor_role);

      await tx.insert(factStatusEvents).values({
        reportId: report.report_id,
        statusId,
        actorRoleId,
        actorId: event.actor.actor_id,
        note: event.note,
        eventTimestamp: new Date(event.timestamp),
      });
    }

    // -----------------------------
    // Media
    // -----------------------------
    for (const media of report.media) {
      await tx
        .insert(factMediaEvents)
        .values({
          mediaId: media.media_id,
          reportId: report.report_id,
          mediaType: media.type,
          uploadedAt: new Date(media.uploaded_at),
        })
        .onConflictDoNothing();
    }

    // -----------------------------
    // Votes
    // -----------------------------
    for (const voterId of report.votes.voters) {
      await tx
        .insert(factVoteEvents)
        .values({
          reportId: report.report_id,
          voterId,
        })
        .onConflictDoNothing();
    }

    // -----------------------------
    // Escalation
    // -----------------------------
    if (report.escalation.is_escalated) {
      await tx.insert(factEscalationEvents).values({
        reportId: report.report_id,
        escalatedTo: report.escalation.escalated_to,
        reason: report.escalation.escalation_reason,
        escalatedAt: new Date(report.escalation.escalated_at),
      });
    }
  });
}
