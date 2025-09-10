import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, RefreshCw, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function CreateTeacherModal({
  open,
  onClose,
}: CreateTeacherModalProps) {
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
    userId: string;
  } | null>(null);

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
      // Lowercase email for consistency
      const payload = {
        ...data,
        email: data.email.toLowerCase(),
      };
      const res = await apiRequest("POST", "/api/users/teacher", payload);
      return await res.json();
    },
    onSuccess: (data) => {
      setCredentials({
        username: data.credentials.username.toLowerCase(),
        password: data.credentials.password,
        userId: data.user.id,
      });
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

  const handleClose = () => {
    form.reset();
    setCredentials(null);
    onClose();
  };

  const regeneratePassword = async () => {
    if (!credentials) return;
    try {
      const newPassword =
        Math.random().toString(36).substr(2, 6).toUpperCase() +
        Math.floor(Math.random() * 90 + 10); // secure 8-char password
      const res = await apiRequest("PATCH", `/api/users/${credentials.userId}`, {
        password: newPassword,
      });
      const data = await res.json();
      setCredentials({
        username: data.user.username.toLowerCase(),
        password: data.password,
        userId: data.user.id,
      });
      toast({ title: "Password regenerated", description: "New password set" });
    } catch (err) {
      toast({ title: "Failed to regenerate password", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: text });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Teacher Account</DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createTeacherMutation.mutate(data))}
            className="space-y-4"
          >
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
                      value={field.value ?? ""}
                      placeholder="Enter teacher's full name"
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
                      value={field.value ?? ""}
                      placeholder="teacher@school.edu"
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
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

            {/* Show generated credentials */}
            {credentials && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Generated Credentials</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Username:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                        {credentials.username}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(credentials.username)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Password:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                        {credentials.password}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={regeneratePassword}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(credentials.password)}
                      >
                        <Copy className="w-4 h-4" />
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
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-secondary text-white hover:bg-emerald-700"
                disabled={createTeacherMutation.isPending}
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
