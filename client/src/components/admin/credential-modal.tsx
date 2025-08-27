import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  student?: {
    studentId: string;
  };
}

interface CredentialModalProps {
  open: boolean;
  onClose: () => void;
  selectedUsers: {
    id: string;
    name: string;
    username: string;
    email?: string;
    role: "teacher" | "student" | "admin";
    student?: { studentId: string; rollNo: string };
    teacher?: { employeeId?: string; department?: string };
  }[];
  onSend: (message?: string) => void;   // ✅ add this
}

export default function CredentialModal({ open, onClose, selectedUsers }: CredentialModalProps) {
  const [deliveryMethod, setDeliveryMethod] = useState("email");
  const [emailTemplate, setEmailTemplate] = useState("welcome");

  const handleSend = () => {
    // TODO: Implement credential sending logic
    console.log("Sending credentials via:", deliveryMethod);
    console.log("Email template:", emailTemplate);
    console.log("Selected users:", selectedUsers);
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "teacher":
        return "bg-secondary/10 text-secondary";
      case "student":
        return "bg-primary/10 text-primary";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Send Login Credentials</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              data-testid="button-close-credential-modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div>
          <div className="mb-6">
            <h4 className="font-medium text-slate-900 mb-3">
              Selected Users ({selectedUsers.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg"
                  data-testid={`selected-user-${user.id}`}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {getInitials(user.name)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">
                      {user.email || user.student?.studentId || "No email"}
                    </p>
                  </div>
                  <Badge className={getRoleBadgeStyle(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Delivery Method
              </Label>
              <RadioGroup
                value={deliveryMethod}
                onValueChange={setDeliveryMethod}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" data-testid="radio-email" />
                  <Label htmlFor="email" className="text-sm text-slate-700">
                    Send via Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="print" id="print" data-testid="radio-print" />
                  <Label htmlFor="print" className="text-sm text-slate-700">
                    Generate Printable Cards
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" data-testid="radio-both" />
                  <Label htmlFor="both" className="text-sm text-slate-700">
                    Both Email and Print
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="email-template" className="text-sm font-medium text-slate-700 mb-2 block">
                Email Template
              </Label>
              <Select value={emailTemplate} onValueChange={setEmailTemplate}>
                <SelectTrigger data-testid="select-email-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome - New Account</SelectItem>
                  <SelectItem value="reset">Password Reset</SelectItem>
                  <SelectItem value="activation">Account Activation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="font-medium text-slate-900 mb-2">Email Preview</h5>
              <div className="text-sm text-slate-600 space-y-1">
                <p>
                  <strong>Subject:</strong> Welcome to SmartAttend - Your Login Credentials
                </p>
                <p>
                  <strong>Body:</strong> Dear [Name], your account has been created...
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-white hover:bg-blue-700"
              onClick={handleSend}
              data-testid="button-send-credentials"
            >
              Send Credentials
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
