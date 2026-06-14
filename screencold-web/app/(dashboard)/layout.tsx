"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutsPanel } from "@/components/layout/shortcuts-panel";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { loadShortcuts, toShortcutDef } from "@/lib/shortcut-config";
import { ToastProvider } from '@screencold/ui';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);

  // Build shortcut definitions from config (supports user customization)
  // Runs on every render so loadShortcuts picks up the latest localStorage changes
  const shortcutDefs = loadShortcuts().map((entry) => {
    switch (entry.id) {
      case "command-palette": return toShortcutDef(entry, () => setCommandPaletteOpen(true));
      case "shortcuts-panel": return toShortcutDef(entry, () => setShortcutsPanelOpen((p) => !p));
      case "new-audit": return toShortcutDef(entry, () => router.push("/audits/new"));
      case "new-campaign": return toShortcutDef(entry, () => router.push("/campaigns/new"));
      case "go-dashboard": return toShortcutDef(entry, () => router.push("/dashboard"));
      case "go-audits": return toShortcutDef(entry, () => router.push("/audits"));
      case "go-campaigns": return toShortcutDef(entry, () => router.push("/campaigns"));
      case "go-settings": return toShortcutDef(entry, () => router.push("/settings"));
      default: return null;
    }
  }).filter(Boolean) as { key: string; meta?: boolean; shift?: boolean; leader?: string; handler: () => void; allowInInputs?: boolean }[];

  // Global keyboard shortcuts
  const leaderKey = useKeyboardShortcuts(shortcutDefs);

  const handleClosePalette = useCallback(() => setCommandPaletteOpen(false), []);
  const handleCloseShortcuts = useCallback(() => setShortcutsPanelOpen(false), []);

  const handleRestartOnboarding = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("screencold-onboarding-completed");
      window.dispatchEvent(new CustomEvent("restart-onboarding"));
    }
  }, []);

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
    { label: "Paramètres", href: "/settings" },
    { label: "", separator: true },
    { label: "Se déconnecter", onClick: handleLogout },
  ];

  return (
    <ToastProvider>
      {/* Command Palette (Cmd+K) */}
      <CommandPalette open={commandPaletteOpen} onClose={handleClosePalette} />

      {/* Shortcuts Reference Panel (?) */}
      <ShortcutsPanel open={shortcutsPanelOpen} onClose={handleCloseShortcuts} />

      {/* Leader key indicator */}
      {leaderKey && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <span className="opacity-60">Mode leader&nbsp;·&nbsp;appuyez sur</span>
          {" "}<kbd className="mx-0.5 rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs uppercase">{leaderKey === "g" ? "D" : ""}</kbd>
          <kbd className="mx-0.5 rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs uppercase">A</kbd>
          <kbd className="mx-0.5 rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs uppercase">C</kbd>
          <kbd className="mx-0.5 rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs uppercase">P</kbd>
        </div>
      )}

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
            onOpenShortcuts={() => setShortcutsPanelOpen(true)}
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader
            title=""
            onMenuClick={() => setMobileSidebarOpen(true)}
            onRestartOnboarding={handleRestartOnboarding}
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