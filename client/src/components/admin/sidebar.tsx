"use client";

import { useLocation } from "wouter";
import { ShieldCheck, LayoutDashboard, Users, GraduationCap, BookOpen, BarChart3, Settings, User, LogOut, X } from "lucide-react";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  currentUser?: {
    name: string;
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ currentUser, isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "User Management", path: "/admin/users" },
    { icon: GraduationCap, label: "Students", path: "/admin/students" },
    { icon: BookOpen, label: "Classes", path: "/admin/classes" },
    { icon: BarChart3, label: "Reports", path: "/admin/reports" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg border-r border-slate-200 z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Close button for mobile */}
        <div className="p-4 flex justify-end lg:hidden">
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Admin Panel</h2>
              <p className="text-xs text-slate-500">System Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;

              return (
                <li key={item.path}>
                  <button
                    onClick={() => setLocation(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                      isActive ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info & logout */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{currentUser?.name || "Admin User"}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-700 hover:text-white hover:bg-red-500"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
