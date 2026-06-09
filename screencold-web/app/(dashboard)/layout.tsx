"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ToastProvider } from '@screencold/ui';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-info-600 border-t-transparent" />
          <p className="text-sm text-neutral-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const user = {
    name: session?.user?.name || "Utilisateur",
    email: session?.user?.email || "",
    plan: (session?.user?.plan as string) || "FREE",
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const userMenuItems = [
    { label: "Mon profil", href: "/settings" },
    { label: "Paramètres", href: "/settings" },
    { label: "", separator: true },
    { label: "Se déconnecter", onClick: handleLogout },
  ];

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-neutral-50">
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
          <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default DashboardLayout;