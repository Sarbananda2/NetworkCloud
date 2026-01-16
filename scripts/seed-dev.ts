/**
 * Development Seed Script
 * 
 * Run this script to populate test devices for development/testing purposes.
 * Usage: npx tsx scripts/seed-dev.ts <userId>
 * 
 * Example: npx tsx scripts/seed-dev.ts 12345678
 */

import { db } from "../server/db";
import { devices, deviceNetworkStates } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedDevicesForUser(userId: string) {
  console.log(`\n[SEED] Seeding demo devices for user: ${userId}\n`);

  // Check if user already has devices
  const existingDevices = await db.select().from(devices).where(eq(devices.userId, userId));
  
  if (existingDevices.length > 0) {
    console.log(`[WARN] User already has ${existingDevices.length} device(s). Skipping seed.`);
    console.log("       To force re-seed, first delete existing devices.\n");
    return;
  }

  // Create demo devices
  const demoDevices = [
    { name: "Living Room Hub", status: "online" as const, ip: "192.168.1.105", isLastKnown: false },
    { name: "Kitchen Display", status: "offline" as const, ip: "192.168.1.112", isLastKnown: true },
    { name: "Garage Sensor", status: "away" as const, ip: "192.168.1.98", isLastKnown: true },
  ];

  for (const demo of demoDevices) {
    const [device] = await db.insert(devices).values({
      userId,
      name: demo.name,
      status: demo.status,
    }).returning();

    await db.insert(deviceNetworkStates).values({
      deviceId: device.id,
      ipAddress: demo.ip,
      isLastKnown: demo.isLastKnown,
      updatedAt: new Date(),
    });

    console.log(`[OK] Created: ${demo.name} (${demo.status}) - ${demo.ip}`);
  }

  console.log(`\n[DONE] Successfully seeded ${demoDevices.length} devices for user ${userId}\n`);
}

// Main execution
const userId = process.argv[2];

if (!userId) {
  console.error("\n[ERROR] Please provide a user ID");
  console.error("        Usage: npx tsx scripts/seed-dev.ts <userId>\n");
  process.exit(1);
}

seedDevicesForUser(userId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding devices:", error);
    process.exit(1);
  });
