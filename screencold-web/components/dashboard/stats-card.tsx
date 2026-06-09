"use client";

import * as React from "react";
import { memo } from "react";
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

const StatsCard = memo(function StatsCard({
  title,
  value,
  change,
  icon,
  variant = "default",
}: StatsCardProps) {
  const variants = {
    default: {
      iconBg: "bg-info-50",
      iconColor: "text-info-600",
    },
    success: {
      iconBg: "bg-success-50",
      iconColor: "text-success-600",
    },
    warning: {
      iconBg: "bg-warning-50",
      iconColor: "text-warning-600",
    },
  };

  const { iconBg, iconColor } = variants[variant];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              {change.isPositive ? (
                <TrendingUp className="h-4 w-4 text-success-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-error-500" />
              )}
              <span
                className={clsx(
                  "text-sm font-medium",
                  change.isPositive ? "text-success-600" : "text-error-600"
                )}
              >
                {change.isPositive ? "+" : ""}
                {change.value}%
              </span>
              <span className="text-sm text-neutral-500">ce mois</span>
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
});

export { StatsCard };