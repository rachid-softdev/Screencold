import * as React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ToastProvider } from "@screencold/ui";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Construct user object from session
  const sessionUser = session.user as {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    plan?: string;
    credits?: number;
    role?: string;
    roles?: string[];
  };

  const user = {
    name: sessionUser.name || sessionUser.email || "Utilisateur",
    email: sessionUser.email || "",
    plan: sessionUser.plan || "FREE",
  };

  return (
    <ToastProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
    </ToastProvider>
  );
}

export default DashboardLayout;