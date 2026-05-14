"use client";

import * as React from "react";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning";
}

function StatsCard({
  title,
  value,
  change,
  icon,
  variant = "default",
}: StatsCardProps) {
  const variants = {
    default: {
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    success: {
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    warning: {
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
  };

  const { iconBg, iconColor } = variants[variant];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              {change.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={clsx(
                  "text-sm font-medium",
                  change.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {change.isPositive ? "+" : ""}
                {change.value}%
              </span>
              <span className="text-sm text-gray-500">ce mois</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx("rounded-lg p-2.5", iconBg)}>
            <div className={clsx("h-5 w-5", iconColor)}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export { StatsCard };