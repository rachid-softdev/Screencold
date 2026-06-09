"use client";

import * as React from "react";
import { useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from '@screencold/ui';

type Severity = "HIGH" | "MEDIUM" | "LOW";
type Category =
  | "SEO"
  | "PERFORMANCE"
  | "ACCESSIBILITY"
  | "UX"
  | "SECURITY"
  | "CONTENT";

interface Issue {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  suggestion: string;
  element?: string;
}

interface IssueListProps {
  issues: Issue[];
}

const severityConfig = {
  HIGH: {
    label: "Critique",
    color: "text-error-600",
    bgColor: "bg-error-50",
    borderColor: "border-error-200",
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: "Important",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: AlertCircle,
  },
  LOW: {
    label: "Mineur",
    color: "text-info-600",
    bgColor: "bg-info-50",
    borderColor: "border-info-200",
    icon: Info,
  },
};

const categoryColors: Record<Category, string> = {
  SEO: "bg-purple-100 text-purple-700",
  PERFORMANCE: "bg-warning-100 text-warning-700",
  ACCESSIBILITY: "bg-success-100 text-success-700",
  UX: "bg-pink-100 text-pink-700",
  SECURITY: "bg-error-100 text-error-700",
  CONTENT: "bg-info-100 text-info-700",
};

function IssueItem({ issue }: { issue: Issue }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "rounded-lg border transition-colors",
        config.borderColor,
        config.bgColor
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className={clsx("mt-0.5", config.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive" className="text-xs">
              {config.label}
            </Badge>
            <Badge className="text-xs" style={{ backgroundColor: categoryColors[issue.category], color: 'inherit' }}>
              {issue.category}
            </Badge>
          </div>
          <h4 className="mt-2 text-sm font-medium text-neutral-900">
            {issue.title}
          </h4>
        </div>

        <div className={clsx("shrink-0 text-neutral-400", isExpanded ? "rotate-180" : "")}>
          <ChevronDown className="h-5 w-5" />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-200/50 px-4 py-4 bg-white">
          <p className="text-sm text-neutral-600">{issue.description}</p>

          {issue.element && (
            <div className="mt-3">
              <p className="text-xs font-medium text-neutral-500 mb-1">Élément concerné</p>
              <code className="block rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-700 overflow-x-auto">
                {issue.element}
              </code>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-info-50 p-3">
            <p className="text-xs font-medium text-info-800 mb-1">Recommandation</p>
            <p className="text-sm text-info-700">{issue.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-success-200 bg-success-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-success-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-medium text-success-800">
          Aucun problème détecté
        </h3>
        <p className="mt-1 text-sm text-success-600">
          Ce site semble bien optimisé !
        </p>
      </div>
    );
  }

  // Sort by severity
  const sortedIssues = [...issues].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.severity] - order[b.severity];
  });

  const highCount = issues.filter((i) => i.severity === "HIGH").length;
  const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length;
  const lowCount = issues.filter((i) => i.severity === "LOW").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-error-500" />
          <span className="text-neutral-600">{highCount} critique{highCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-neutral-600">{mediumCount} important{mediumCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Info className="h-4 w-4 text-info-500" />
          <span className="text-neutral-600">{lowCount} mineur{lowCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Issues */}
      <div className="space-y-2">
        {sortedIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

export { IssueList };