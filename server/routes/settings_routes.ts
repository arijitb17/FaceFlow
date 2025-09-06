// routes/settings.ts
import type { Express, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "./auth_routes";

export function registerSettingsRoutes(app: Express) {
  // Get all settings
  app.get("/api/settings", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const mockSettings = [
        {
          id: "1",
          key: "system_name",
          value: "Smart Attendance System",
          description: "The display name of the system",
          category: "general",
          editable: true, // ✅ Can be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "2", 
          key: "max_file_size",
          value: "10",
          description: "Maximum file size in MB for uploads",
          category: "system",
          editable: false, // ❌ System setting - cannot be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "3",
          key: "session_timeout",
          value: "24",
          description: "Session timeout in hours",
          category: "security",
          editable: false, // ❌ Security setting - cannot be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "4",
          key: "face_recognition_threshold",
          value: "0.6",
          description: "Minimum confidence threshold for face recognition",
          category: "ai",
          editable: false, // ❌ AI setting - cannot be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "5",
          key: "auto_backup_enabled",
          value: "true",
          description: "Enable automatic database backups",
          category: "system",
          editable: false, // ❌ System setting - cannot be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "6",
          key: "email_notifications",
          value: "true",
          description: "Enable email notifications for attendance reports",
          category: "notifications",
          editable: true, // ✅ Can be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "7",
          key: "admin_name",
          value: "System Administrator",
          description: "Administrator display name",
          category: "profile",
          editable: true, // ✅ Can be changed
          updatedAt: new Date().toISOString()
        },
        {
          id: "8",
          key: "organization_name",
          value: "My Organization",
          description: "Organization name",
          category: "general",
          editable: true, // ✅ Can be changed
          updatedAt: new Date().toISOString()
        }
      ];
      
      res.json(mockSettings);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update setting - only allow editable settings
  app.put("/api/settings/:key", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }

      // Define which settings can be edited
      const editableSettings = [
        "system_name",
        "organization_name", 
        "admin_name",
        "email_notifications"
        // Add more editable setting keys here
      ];

      // Check if the setting is editable
      if (!editableSettings.includes(key)) {
        return res.status(403).json({ 
          message: "This setting cannot be modified",
          editable: false 
        });
      }

      // Mock response - you'll need to implement actual setting storage
      // For now, we'll just return the updated setting
      const updatedSetting = {
        id: "1",
        key,
        value,
        description: "Setting description",
        category: "general",
        editable: true,
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
        editable: true,
        updatedAt: new Date().toISOString()
      };
      
      res.json(mockSetting);
    } catch (error) {
      console.error("Get setting error:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // Reset settings to default - only reset editable settings
  app.post("/api/settings/reset", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Mock response - you'll need to implement actual reset logic
      const resetMessage = {
        success: true,
        message: "Editable settings have been reset to default values",
        note: "System and security settings were not modified",
        timestamp: new Date().toISOString()
      };
      
      res.json(resetMessage);
    } catch (error) {
      console.error("Reset settings error:", error);
      res.status(500).json({ message: "Failed to reset settings" });
    }
  });

  // Change password endpoint (separate from general settings)
  app.put("/api/settings/password", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: "Current password and new password are required" 
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ 
          message: "New password must be at least 8 characters long" 
        });
      }

      // TODO: Verify current password and update to new password
      // This should include proper password hashing
      
      res.json({ 
        success: true, 
        message: "Password updated successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}