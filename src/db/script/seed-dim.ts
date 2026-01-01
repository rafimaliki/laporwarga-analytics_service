import { db } from "@/db/index";
import {
  dimReportType,
  dimVisibility,
  dimStatus,
  dimActorRole,
  dimCity,
} from "@/db/schema";

// Indonesian cities with real coordinates (population-weighted for realistic distribution)
const indonesianCities = [
  // Java (high population density)
  { name: "Jakarta Pusat", province: "DKI Jakarta", lat: -6.1751, lng: 106.865 },
  { name: "Jakarta Selatan", province: "DKI Jakarta", lat: -6.2615, lng: 106.8106 },
  { name: "Jakarta Timur", province: "DKI Jakarta", lat: -6.225, lng: 106.9004 },
  { name: "Jakarta Barat", province: "DKI Jakarta", lat: -6.1484, lng: 106.7558 },
  { name: "Jakarta Utara", province: "DKI Jakarta", lat: -6.1214, lng: 106.9229 },
  { name: "Surabaya", province: "Jawa Timur", lat: -7.2575, lng: 112.7521 },
  { name: "Bandung", province: "Jawa Barat", lat: -6.9175, lng: 107.6191 },
  { name: "Semarang", province: "Jawa Tengah", lat: -6.9666, lng: 110.4196 },
  { name: "Yogyakarta", province: "DI Yogyakarta", lat: -7.7956, lng: 110.3695 },
  { name: "Bekasi", province: "Jawa Barat", lat: -6.2383, lng: 106.9756 },
  { name: "Tangerang", province: "Banten", lat: -6.1783, lng: 106.63 },
  { name: "Depok", province: "Jawa Barat", lat: -6.4025, lng: 106.7942 },
  { name: "Malang", province: "Jawa Timur", lat: -7.9778, lng: 112.6349 },
  { name: "Bogor", province: "Jawa Barat", lat: -6.5971, lng: 106.806 },

  // Sumatra
  { name: "Medan", province: "Sumatera Utara", lat: 3.5952, lng: 98.6722 },
  { name: "Palembang", province: "Sumatera Selatan", lat: -2.9761, lng: 104.7754 },
  { name: "Pekanbaru", province: "Riau", lat: 0.5071, lng: 101.4478 },
  { name: "Batam", province: "Kepulauan Riau", lat: 1.0456, lng: 104.0305 },
  { name: "Padang", province: "Sumatera Barat", lat: -0.9471, lng: 100.4172 },
  { name: "Bandar Lampung", province: "Lampung", lat: -5.3971, lng: 105.2668 },

  // Kalimantan
  { name: "Balikpapan", province: "Kalimantan Timur", lat: -1.2379, lng: 116.8529 },
  { name: "Banjarmasin", province: "Kalimantan Selatan", lat: -3.3194, lng: 114.59 },
  { name: "Pontianak", province: "Kalimantan Barat", lat: -0.0263, lng: 109.3425 },
  { name: "Samarinda", province: "Kalimantan Timur", lat: -0.4948, lng: 117.1436 },

  // Sulawesi
  { name: "Makassar", province: "Sulawesi Selatan", lat: -5.1477, lng: 119.4327 },
  { name: "Manado", province: "Sulawesi Utara", lat: 1.4748, lng: 124.8421 },
  { name: "Palu", province: "Sulawesi Tengah", lat: -0.8917, lng: 119.8707 },

  // Bali & Nusa Tenggara
  { name: "Denpasar", province: "Bali", lat: -8.6705, lng: 115.2126 },
  { name: "Mataram", province: "Nusa Tenggara Barat", lat: -8.5833, lng: 116.1167 },
  { name: "Kupang", province: "Nusa Tenggara Timur", lat: -10.1772, lng: 123.607 },

  // Papua & Maluku
  { name: "Jayapura", province: "Papua", lat: -2.5337, lng: 140.7181 },
  { name: "Ambon", province: "Maluku", lat: -3.6954, lng: 128.1814 },
];

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

    // -----------------------------
    // Indonesian Cities
    // -----------------------------
    await tx
      .insert(dimCity)
      .values(
        indonesianCities.map((city) => ({
          name: city.name,
          province: city.province,
          centerLat: city.lat,
          centerLng: city.lng,
        }))
      )
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
