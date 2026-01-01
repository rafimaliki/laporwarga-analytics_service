import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  dimReportType,
  dimVisibility,
  dimStatus,
  dimActorRole,
} from "./schema";

async function lookupId<T extends { name: string }>(
  table: any,
  name: string,
  idField: string
) {
  const row = await db
    .select()
    .from(table)
    .where(eq(table.name, name))
    .limit(1);

  if (!row.length) {
    throw new Error(`Missing dimension value: ${name}`);
  }

  return row[0]![idField];
}

export const lookupReportTypeId = (name: string) =>
  lookupId(dimReportType, name, "reportTypeId");

export const lookupVisibilityId = (name: string) =>
  lookupId(dimVisibility, name, "visibilityId");

export const lookupStatusId = (name: string) =>
  lookupId(dimStatus, name, "statusId");

export const lookupActorRoleId = (name: string) =>
  lookupId(dimActorRole, name, "actorRoleId");
