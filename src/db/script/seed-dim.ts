import { db } from "@/db/index";
import {
  dimReportType,
  dimVisibility,
  dimStatus,
  dimActorRole,
} from "@/db/schema";

async function seedDimensions() {
  await db.transaction(async (tx) => {
    // -----------------------------
    // Report Types
    // -----------------------------
    await tx
      .insert(dimReportType)
      .values([
        { name: "kriminalitas" },
        { name: "kebersihan" },
        { name: "kesehatan" },
        { name: "fasilitas" },
        { name: "lainnya" },
      ])
      .onConflictDoNothing();

    // -----------------------------
    // Visibility
    // -----------------------------
    await tx
      .insert(dimVisibility)
      .values([{ name: "public" }, { name: "private" }, { name: "anonymous" }])
      .onConflictDoNothing();

    // -----------------------------
    // Status
    // -----------------------------
    await tx
      .insert(dimStatus)
      .values([
        { name: "submitted" },
        { name: "verified" },
        { name: "in_progress" },
        { name: "resolved" },
        { name: "rejected" },
        { name: "escalated" },
      ])
      .onConflictDoNothing();

    // -----------------------------
    // Actor Roles
    // -----------------------------
    await tx
      .insert(dimActorRole)
      .values([
        { name: "citizen" },
        { name: "officer" },
        { name: "supervisor" },
        { name: "system" },
      ])
      .onConflictDoNothing();
  });
}

async function main() {
  try {
    console.log("Seeding dimension tables...");
    await seedDimensions();
    console.log("Dimension tables seeded successfully.");
  } catch (error) {
    console.error("Error seeding dimension tables:", error);
  }
}

main();
