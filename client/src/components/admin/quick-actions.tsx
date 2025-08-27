import { Upload, Mail, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onBulkImport: () => void;
  onSendCredentials: () => void;
  onGenerateReport: () => void;
  onSystemSettings: () => void;
}

export default function QuickActions({
  onBulkImport,
  onSendCredentials,
  onGenerateReport,
  onSystemSettings,
}: QuickActionsProps) {
  const actions = [
    {
      icon: Upload,
      title: "Bulk Import",
      description: "Import users from CSV",
      onClick: onBulkImport,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      testId: "button-bulk-import",
    },
    {
      icon: Mail,
      title: "Send Credentials",
      description: "Email login details",
      onClick: onSendCredentials,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      testId: "button-send-credentials",
    },
    {
      icon: FileText,
      title: "Generate Report",
      description: "User activity report",
      onClick: onGenerateReport,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      testId: "button-generate-report",
    },
    {
      icon: Settings,
      title: "System Settings",
      description: "Configure system",
      onClick: onSystemSettings,
      bgColor: "bg-slate-100",
      iconColor: "text-slate-600",
      testId: "button-system-settings",
    },
  ];

  return (
    <div>
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
                className="w-full flex items-center space-x-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left h-auto justify-start"
                data-testid={action.testId}
              >
                <div className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}>
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
    </div>
  );
}
