"use client";

import { Upload, Mail, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface QuickActionsProps {}

export default function QuickActions({}: QuickActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleBulkImport = async () => {
    setLoading("bulk");
    try {
      const res = await fetch("/api/users/bulk-import", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed bulk import");
      alert("Bulk import successful ✅");
    } catch (err) {
      console.error(err);
      alert("Error during bulk import ❌");
    } finally {
      setLoading(null);
    }
  };

  const handleSendCredentials = async () => {
    setLoading("send");
    try {
      const res = await fetch("/api/users/send-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ["some-user-id"], // replace dynamically
          message: "Here are your credentials",
        }),
      });
      if (!res.ok) throw new Error("Failed to send credentials");
      alert("Credentials sent ✅");
    } catch (err) {
      console.error(err);
      alert("Error sending credentials ❌");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateReport = async () => {
    setLoading("report");
    try {
      const res = await fetch("/api/users?role=all&status=all");
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      console.log("Report:", data);
      alert("Report generated in console ✅");
    } catch (err) {
      console.error(err);
      alert("Error generating report ❌");
    } finally {
      setLoading(null);
    }
  };

  const handleSystemSettings = () => {
    alert("Redirecting to system settings ⚙️");
    // could be a navigation, e.g. router.push("/settings")
  };

  const actions = [
    {
      icon: Upload,
      title: "Bulk Import",
      description: "Import users from CSV",
      onClick: handleBulkImport,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      testId: "button-bulk-import",
    },
    {
      icon: Mail,
      title: "Send Credentials",
      description: "Email login details",
      onClick: handleSendCredentials,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      testId: "button-send-credentials",
    },
    {
      icon: FileText,
      title: "Generate Report",
      description: "User activity report",
      onClick: handleGenerateReport,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      testId: "button-generate-report",
    },
    {
      icon: Settings,
      title: "System Settings",
      description: "Configure system",
      onClick: handleSystemSettings,
      bgColor: "bg-slate-100",
      iconColor: "text-slate-600",
      testId: "button-system-settings",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Quick Actions</h3>

      <div className="space-y-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={action.onClick}
              disabled={loading !== null}
              className="w-full flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left h-auto justify-start"
              data-testid={action.testId}
            >
              <div
                className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div>
                <p className="font-medium text-slate-900">{action.title}</p>
                <p className="text-sm text-slate-500">{action.description}</p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
