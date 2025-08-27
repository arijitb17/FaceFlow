import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, RefreshCw } from "lucide-react";
import Sidebar from "@/components/admin/sidebar";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // ✅ useQuery typed
  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const token = localStorage.getItem("auth_token"); // ✅ fixed
      const response = await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update setting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Setting updated successfully" });
      setEditValues({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  const handleSave = (setting: Setting) => {
    const newValue = editValues[setting.key] ?? setting.value;
    updateSettingMutation.mutate({ key: setting.key, value: newValue });
  };

  const handleInputChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  // ✅ Group by category
  const groupedSettings = useMemo(
    () =>
      (settings ?? []).reduce((acc: Record<string, Setting[]>, setting) => {
        if (!acc[setting.category]) acc[setting.category] = [];
        acc[setting.category].push(setting);
        return acc;
      }, {}),
    [settings]
  );

  const renderInput = (setting: Setting) => {
    const currentValue = editValues[setting.key] ?? setting.value;

    // ✅ Boolean toggle
    if (["true", "false"].includes(setting.value.toLowerCase())) {
      return (
        <Switch
          checked={currentValue === "true"}
          onCheckedChange={(checked) =>
            handleInputChange(setting.key, String(checked))
          }
        />
      );
    }

    // ✅ Long text
    if (setting.key.includes("description") || setting.key.includes("notes")) {
      return (
        <Textarea
          value={currentValue}
          onChange={(e) => handleInputChange(setting.key, e.target.value)}
          className="w-full"
          rows={2}
        />
      );
    }

    // ✅ Default text/number input
    return (
      <Input
        type={/^\d+$/.test(setting.value) ? "number" : "text"}
        value={currentValue}
        onChange={(e) => handleInputChange(setting.key, e.target.value)}
        className="w-full"
      />
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-6 h-6 text-slate-600" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                System Settings
              </h1>
              <p className="text-slate-600">
                Configure system preferences and behavior
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSettings).map(
                ([category, categorySettings]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="capitalize text-lg">
                        {category} Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {categorySettings.map((setting) => {
                        const currentValue =
                          editValues[setting.key] ?? setting.value;
                        const isChanged = currentValue !== setting.value;

                        return (
                          <div
                            key={setting.key}
                            className="border-b border-slate-100 pb-4 last:border-b-0"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                              <div>
                                <Label className="text-sm font-medium text-slate-700">
                                  {setting.key
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </Label>
                                <p className="text-xs text-slate-500 mt-1">
                                  {setting.description}
                                </p>
                              </div>
                              <div>{renderInput(setting)}</div>
                              <div className="flex items-center">
                                <Button
                                  onClick={() => handleSave(setting)}
                                  disabled={
                                    updateSettingMutation.isPending || !isChanged
                                  }
                                  size="sm"
                                >
                                  {updateSettingMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4 mr-1" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )
              )}

              {Object.keys(groupedSettings).length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <SettingsIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No settings configured</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
