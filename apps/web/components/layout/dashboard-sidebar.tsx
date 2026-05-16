"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Search,
  Megaphone,
  Settings,
  ChevronLeft,
  LogOut,
  User,
  CreditCard,
  Key,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: "/audits",
    label: "Audits",
    icon: <Search className="h-5 w-5" />,
  },
  {
    href: "/campaigns",
    label: "Campagnes",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: <Settings className="h-5 w-5" />,
  },
];

interface DashboardSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    plan?: string;
  };
  collapsed?: boolean;
  onToggle?: () => void;
}

function DashboardSidebar({ user, collapsed = false, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();

  const userMenuItems = [
    { label: "Mon compte", href: "/settings", icon: <User className="w-4 h-4" /> },
    { label: "Équipes", href: "/settings/teams", icon: <Users className="w-4 h-4" /> },
    { label: "Clés API", href: "/settings/api-keys", icon: <Key className="w-4 h-4" /> },
    { label: "Facturation", href: "/settings/billing", icon: <CreditCard className="w-4 h-4" /> },
    { label: "", separator: true },
    { label: "Se déconnecter", onClick: () => signOut() },
  ];

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-gray-900">ScreenCold</span>
          )}
        </Link>
        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={collapsed ? "Développer" : "Réduire"}
          >
            <ChevronLeft
              className={clsx(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                collapsed && "justify-center px-2"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        {user ? (
          <Dropdown
            trigger={
              <div
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50",
                  collapsed && "justify-center"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || ""}
                      width={32}
                      height={32}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium">
                      {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {user.name || "Utilisateur"}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {user.plan || "FREE"}
                    </Badge>
                  </div>
                )}
              </div>
            }
            items={userMenuItems}
            align="left"
          />
        ) : (
          <div
            className={clsx(
              "flex items-center gap-3 rounded-lg p-2",
              collapsed && "justify-center"
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            {!collapsed && (
              <span className="text-sm font-medium text-gray-600">
                Chargement...
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export { DashboardSidebar };