import { useState, useMemo } from "react";
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

const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").nullable().optional(),
  yearLevel: z.coerce.number().optional(),
  program: z.string().optional(),
  sendEmail: z.boolean().default(true),
  printCredentials: z.boolean().default(false),
});

type CreateStudentForm = z.infer<typeof createStudentSchema>;

interface CreateStudentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateStudentModal({ open, onClose }: CreateStudentModalProps) {
  const [credentials, setCredentials] = useState<{ studentId: string; password: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      yearLevel: undefined,
      program: "",
      sendEmail: true,
      printCredentials: false,
    },
  });

  const createStudentMutation = useMutation<any, unknown, CreateStudentForm>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/users/student", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setCredentials(data.credentials);
      toast({
        title: "Student created successfully",
        description: `Account created for ${data.user.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create student",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const generateStudentCredentials = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
    const studentId = `STU${year}${random}`;
    const password = "STU-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    return { studentId, password };
  };

  const onSubmit = (data: CreateStudentForm) => {
    createStudentMutation.mutate(data);
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
        password: "STU-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      });
    }
  };

  // ✅ Generate preview credentials only once
  const previewCredentials = useMemo(() => generateStudentCredentials(), []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Student Account</DialogTitle>
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
                    <Input {...field} placeholder="Enter student's full name" data-testid="input-student-name" />
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
          placeholder="student@school.edu"
          data-testid="input-student-email"
          value={field.value ?? ""}   // ✅ Fix: ensure it's always a string
          onChange={(e) => field.onChange(e.target.value)} // ✅ Normalize event
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>


            {/* Year & Program */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-student-year">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-student-program">
                          <SelectValue placeholder="Select Program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cs">Computer Science</SelectItem>
                        <SelectItem value="it">Information Technology</SelectItem>
                        <SelectItem value="math">Mathematics</SelectItem>
                        <SelectItem value="physics">Physics</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Credentials Preview */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-3">Generated Credentials</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Student ID:</span>
                  <span
                    className="font-mono text-sm bg-white px-2 py-1 rounded border"
                    data-testid="text-generated-student-id"
                  >
                    {credentials?.studentId || previewCredentials.studentId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Password:</span>
                  <div className="flex items-center space-x-2">
                    <span
                      className="font-mono text-sm bg-white px-2 py-1 rounded border"
                      data-testid="text-generated-student-password"
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
                        data-testid="button-regenerate-student-password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-send-student-email" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Send credentials via email</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="printCredentials"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-print-credentials" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Generate printable credential card</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                data-testid="button-cancel-student"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-white hover:bg-blue-700"
                disabled={createStudentMutation.isPending}
                data-testid="button-create-student"
              >
                {createStudentMutation.isPending ? "Creating..." : "Create Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
