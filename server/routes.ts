import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { api } from "@shared/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Protect all /api/devices routes
  // (We use inline middleware or the helper wrapper)
  
  app.get(api.devices.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // From Replit Auth
      let devices = await storage.getDevices(userId);

      // AUTO-SEED FOR DEMO: If user has no devices, create some!
      if (devices.length === 0) {
        console.log(`Auto-seeding demo data for user ${userId}`);
        const d1 = await storage.createDevice({
          userId,
          name: "Living Room Hub",
          status: "online"
        });
        await storage.updateNetworkState(d1.id, "192.168.1.105", false);

        const d2 = await storage.createDevice({
          userId,
          name: "Kitchen Display",
          status: "offline"
        });
        await storage.updateNetworkState(d2.id, "192.168.1.112", true); // last known

        const d3 = await storage.createDevice({
          userId,
          name: "Garage Sensor",
          status: "away"
        });
        
        // Refresh list
        devices = await storage.getDevices(userId);
      }

      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.devices.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Ensure user owns this device
      const userId = req.user.claims.sub;
      if (device.userId !== userId) {
        return res.status(401).json({ message: "Unauthorized access to this device" });
      }

      res.json(device);
    } catch (error) {
      console.error("Error fetching device:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.devices.getNetworkState.path, isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      // Check ownership first
      const device = await storage.getDevice(deviceId);
      const userId = req.user.claims.sub;
      
      if (!device || device.userId !== userId) {
        // Return 404 to avoid leaking existence, or 401 if strict
        return res.status(404).json({ message: "Device not found" });
      }

      const state = await storage.getDeviceNetworkState(deviceId);
      
      // It's valid to have a device with no network state yet
      res.json(state || null);
    } catch (error) {
      console.error("Error fetching network state:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // 3. Seed Data Endpoint (For demonstration/dev purposes)
  // In a real app, this would be triggered by an admin or agent registration
  app.post("/api/seed-demo-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has devices
      const existing = await storage.getDevices(userId);
      if (existing.length > 0) {
        return res.json({ message: "Data already seeded", devices: existing });
      }

      // Create example devices
      const d1 = await storage.createDevice({
        userId,
        name: "Living Room Hub",
        status: "online"
      });
      await storage.updateNetworkState(d1.id, "192.168.1.105", false);

      const d2 = await storage.createDevice({
        userId,
        name: "Kitchen Display",
        status: "offline"
      });
      await storage.updateNetworkState(d2.id, "192.168.1.112", true); // last known

       const d3 = await storage.createDevice({
        userId,
        name: "Garage Sensor",
        status: "away"
      });
      // No network state for this one yet

      res.json({ message: "Seeded 3 demo devices" });
    } catch (error) {
      console.error("Error seeding:", error);
      res.status(500).json({ message: "Seeding failed" });
    }
  });

  return httpServer;
}
