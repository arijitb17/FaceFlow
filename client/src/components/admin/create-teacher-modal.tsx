import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const createTeacherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  department: z.string().min(1, "Department is required"),
  sendEmail: z.boolean().default(true),
  forcePasswordChange: z.boolean().default(true),
});

type CreateTeacherForm = z.infer<typeof createTeacherSchema>;

interface CreateTeacherModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateTeacherModal({ open, onClose }: CreateTeacherModalProps) {
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<CreateTeacherForm>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
      sendEmail: true,
      forcePasswordChange: true,
    },
  });

  const createTeacherMutation = useMutation<any, unknown, CreateTeacherForm>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/users/teacher", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setCredentials(data.credentials);
      toast({
        title: "Teacher created successfully",
        description: `Account created for ${data.user.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create teacher",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const generateCredentials = (name: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, ".");
    const username = cleanName + ".teacher";
    const password = "TMP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    return { username, password };
  };

  const onSubmit = (data: CreateTeacherForm) => {
    createTeacherMutation.mutate(data);
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
        password: "TMP-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      });
    }
  };

  // Generate preview credentials when name changes
  const watchedName = form.watch("name");
  const previewCredentials = watchedName ? generateCredentials(watchedName) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Teacher Account</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600"
              data-testid="button-close-teacher-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""} // ✅ ensure string
                      placeholder="Enter teacher's full name"
                      data-testid="input-teacher-name"
                    />
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
                    <Input
                      {...field}
                      type="email"
                      value={field.value ?? ""} // ✅ ensure string
                      placeholder="teacher@school.edu"
                      data-testid="input-teacher-email"
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department */}
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-teacher-department">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="computer-science">Computer Science</SelectItem>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Generated Credentials */}
            {previewCredentials && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Generated Credentials</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Username:</span>
                    <span
                      className="font-mono text-sm bg-white px-2 py-1 rounded border"
                      data-testid="text-generated-username"
                    >
                      {credentials?.username || previewCredentials.username}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Password:</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className="font-mono text-sm bg-white px-2 py-1 rounded border"
                        data-testid="text-generated-password"
                      >
                        {credentials?.password || previewCredentials.password}
                      </span>
                      {credentials && (
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
                      )}
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

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                data-testid="button-cancel-teacher"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-secondary text-white hover:bg-emerald-700"
                disabled={createTeacherMutation.isPending}
                data-testid="button-create-teacher"
              >
                {createTeacherMutation.isPending ? "Creating..." : "Create Teacher"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
