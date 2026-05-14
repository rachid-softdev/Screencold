"use client";

import * as React from "react";
import { Menu, Bell, User } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface DashboardHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  onMenuClick?: () => void;
  userMenuItems?: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
    separator?: boolean;
  }>;
}

function DashboardHeader({
  title,
  breadcrumbs = [],
  onMenuClick,
  userMenuItems = [],
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div>
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="hidden sm:flex" aria-label="Fil d'Ariane">
              <ol className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.label}>
                    {index > 0 && (
                      <li className="text-gray-400" aria-hidden="true">
                        /
                      </li>
                    )}
                    <li>
                      {crumb.href ? (
                        <a
                          href={crumb.href}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span className="text-gray-900 font-medium">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  </React.Fragment>
                ))}
              </ol>
            </nav>
          )}

          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User Menu */}
        <Dropdown
          trigger={
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors">
              <User className="h-4 w-4" />
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}

export { DashboardHeader };