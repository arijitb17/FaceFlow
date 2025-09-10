import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const createAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  sendEmail: z.boolean().default(true),
  forcePasswordChange: z.boolean().default(true),
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

interface CreateAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateAdminModal({ open, onClose }: CreateAdminModalProps) {
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      sendEmail: true,
      forcePasswordChange: true,
    },
  });

  const createAdminMutation = useMutation<any, unknown, CreateAdminForm>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/users/admin", {
        ...data,
        role: "admin", // enforce admin role
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setCredentials(data.credentials);
      toast({
        title: "Admin created successfully",
        description: `Account created for ${data.user.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create admin",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const generatePassword = () =>
    "TMP-" + Math.random().toString(36).substr(2, 6).toUpperCase();

  const onSubmit = (data: CreateAdminForm) => {
    const password = generatePassword();
    setCredentials({ username: data.username, password });
    createAdminMutation.mutate({ ...data });
  };

  const handleClose = () => {
    form.reset();
    setCredentials(null);
    onClose();
  };

  const regeneratePassword = () => {
    if (credentials) {
      setCredentials({
        ...credentials,
        password: generatePassword(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Admin Account</DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter admin's full name" data-testid="input-admin-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="admin@school.edu" data-testid="input-admin-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="admin.username" data-testid="input-admin-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credentials Preview */}
            {credentials && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Generated Credentials</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Username:</span>
                    <span
                      className="font-mono text-sm bg-white px-2 py-1 rounded border"
                      data-testid="text-generated-username"
                    >
                      {credentials.username}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Password:</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className="font-mono text-sm bg-white px-2 py-1 rounded border"
                        data-testid="text-generated-password"
                      >
                        {credentials.password}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={regeneratePassword}
                        className="text-primary hover:text-blue-700"
                        data-testid="button-regenerate-password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-send-email" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Send credentials via email</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="forcePasswordChange"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-force-password-change"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Force password change on first login</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                data-testid="button-cancel-admin"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-secondary text-white hover:bg-emerald-700"
                disabled={createAdminMutation.isPending}
                data-testid="button-create-admin"
              >
                {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
