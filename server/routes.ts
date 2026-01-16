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
      const devices = await storage.getDevices(userId);
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

  // Account deletion endpoint
  app.delete("/api/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Delete all user data
      await storage.deleteAccount(userId);
      
      // Logout the user
      req.logout((err: any) => {
        if (err) {
          console.error("Error during logout after account deletion:", err);
        }
        req.session.destroy((sessionErr: any) => {
          if (sessionErr) {
            console.error("Error destroying session:", sessionErr);
          }
          res.clearCookie("connect.sid");
          res.status(204).send();
        });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  return httpServer;
}
