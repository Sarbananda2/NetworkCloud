import { db } from "./db";
import { devices, deviceNetworkStates, type Device, type NetworkState } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Read-only operations for the frontend
  getDevices(userId: string): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceNetworkState(deviceId: number): Promise<NetworkState | undefined>;
  
  // Internal operations for seeding/agent updates (not exposed via write API)
  createDevice(device: Omit<Device, "id" | "createdAt" | "lastSeenAt"> & { userId: string }): Promise<Device>;
  updateNetworkState(deviceId: number, ipAddress: string, isLastKnown: boolean): Promise<NetworkState>;
}

export class DatabaseStorage implements IStorage {
  async getDevices(userId: string): Promise<Device[]> {
    return await db.select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.lastSeenAt));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getDeviceNetworkState(deviceId: number): Promise<NetworkState | undefined> {
    const [state] = await db.select()
      .from(deviceNetworkStates)
      .where(eq(deviceNetworkStates.deviceId, deviceId));
    return state;
  }

  // Internal use only
  async createDevice(device: Omit<Device, "id" | "createdAt" | "lastSeenAt"> & { userId: string }): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async updateNetworkState(deviceId: number, ipAddress: string, isLastKnown: boolean): Promise<NetworkState> {
    // Upsert network state
    const [state] = await db.insert(deviceNetworkStates)
      .values({
        deviceId,
        ipAddress,
        isLastKnown,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: deviceNetworkStates.deviceId,
        set: {
          ipAddress,
          isLastKnown,
          updatedAt: new Date()
        }
      })
      .returning();
    return state;
  }
}

export const storage = new DatabaseStorage();
