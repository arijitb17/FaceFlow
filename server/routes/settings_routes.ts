// routes/settings.ts
import type { Express, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "./auth";

export function registerSettingsRoutes(app: Express) {
  // Get all settings
  app.get("/api/settings", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Since there's no settings table in your schema, return mock data
      // You'll need to add a settings table to your schema if you want real settings
      const mockSettings = [
        {
          id: "1",
          key: "system_name",
          value: "Smart Attendance System",
          description: "The display name of the system",
          category: "general",
          updatedAt: new Date().toISOString()
        },
        {
          id: "2", 
          key: "max_file_size",
          value: "10",
          description: "Maximum file size in MB for uploads",
          category: "system",
          updatedAt: new Date().toISOString()
        },
        {
          id: "3",
          key: "session_timeout",
          value: "24",
          description: "Session timeout in hours",
          category: "security",
          updatedAt: new Date().toISOString()
        },
        {
          id: "4",
          key: "face_recognition_threshold",
          value: "0.6",
          description: "Minimum confidence threshold for face recognition",
          category: "ai",
          updatedAt: new Date().toISOString()
        },
        {
          id: "5",
          key: "auto_backup_enabled",
          value: "true",
          description: "Enable automatic database backups",
          category: "system",
          updatedAt: new Date().toISOString()
        },
        {
          id: "6",
          key: "email_notifications",
          value: "true",
          description: "Enable email notifications for attendance reports",
          category: "notifications",
          updatedAt: new Date().toISOString()
        }
      ];
      
      res.json(mockSettings);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update setting
  app.put("/api/settings/:key", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }

      // Mock response - you'll need to implement actual setting storage
      // For now, we'll just return the updated setting
      const updatedSetting = {
        id: "1",
        key,
        value,
        description: "Setting description",
        category: "general",
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedSetting);
    } catch (error) {
      console.error("Update setting error:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Get setting by key
  app.get("/api/settings/:key", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      
      // Mock response - replace with actual database query
      const mockSetting = {
        id: "1",
        key,
        value: "default_value",
        description: "Setting description",
        category: "general",
        updatedAt: new Date().toISOString()
      };
      
      res.json(mockSetting);
    } catch (error) {
      console.error("Get setting error:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // Reset settings to default
  app.post("/api/settings/reset", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Mock response - you'll need to implement actual reset logic
      const resetMessage = {
        success: true,
        message: "Settings have been reset to default values",
        timestamp: new Date().toISOString()
      };
      
      res.json(resetMessage);
    } catch (error) {
      console.error("Reset settings error:", error);
      res.status(500).json({ message: "Failed to reset settings" });
    }
  });
}