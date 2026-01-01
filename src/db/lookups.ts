import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  dimReportType,
  dimVisibility,
  dimStatus,
  dimActorRole,
  dimCity,
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

/**
 * Find the nearest city to a given lat/lng coordinate.
 * Uses Haversine-like distance approximation.
 * Returns null if no cities in database.
 */
export async function lookupNearestCityId(
  latitude: number,
  longitude: number
): Promise<number | null> {
  // First try exact city match if city name is provided
  const result = await db
    .select({
      cityId: dimCity.cityId,
      distance: sql<number>`
        SQRT(
          POW((${dimCity.centerLat} - ${latitude}) * 111, 2) +
          POW((${dimCity.centerLng} - ${longitude}) * 111 * COS(RADIANS(${latitude})), 2)
        )
      `.as("distance"),
    })
    .from(dimCity)
    .orderBy(sql`distance`)
    .limit(1);

  return result.length > 0 ? result[0].cityId : null;
}

/**
 * Lookup city by exact name match.
 */
export async function lookupCityIdByName(
  cityName: string
): Promise<number | null> {
  const row = await db
    .select({ cityId: dimCity.cityId })
    .from(dimCity)
    .where(eq(dimCity.name, cityName))
    .limit(1);

  return row.length > 0 ? row[0].cityId : null;
}
