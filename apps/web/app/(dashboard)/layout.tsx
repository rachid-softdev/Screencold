"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ToastProvider } from "@/components/ui/toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Mock user data - replace with actual auth check
  const user = {
    name: "Jean Dupont",
    email: "jean@example.com",
    plan: "PRO" as const,
  };

  useEffect(() => {
    // In production, check auth status here
    // For now, we'll simulate authenticated state
    const checkAuth = async () => {
      // Simulate auth check delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  const userMenuItems = [
    { label: "Mon profil", href: "/settings" },
    { label: "Paramètres", href: "/settings" },
    { label: "", separator: true },
    { label: "Se déconnecter", onClick: () => router.push("/login") },
  ];

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <div
          className={`${
            mobileSidebarOpen ? "block" : "hidden"
          } fixed inset-0 z-40 lg:static lg:block`}
        >
          <div
            className="absolute inset-0 bg-black/50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <DashboardSidebar
            user={user}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader
            title=""
            onMenuClick={() => setMobileSidebarOpen(true)}
            userMenuItems={userMenuItems}
          />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default DashboardLayout;