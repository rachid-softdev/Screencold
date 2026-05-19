"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Check, Loader2, X } from "lucide-react";

type StepStatus = "pending" | "active" | "completed" | "error";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface AuditProgressProps {
  steps: Step[];
  error?: string | null;
}

function StepItem({ step, index }: { step: Step; index: number }) {
  const isLast = index === 0;

  return (
    <React.Fragment>
      {/* Step circle */}
      <div className="relative flex flex-col items-center">
        <div
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
            step.status === "completed" &&
              "border-green-500 bg-green-500 text-white",
            step.status === "active" &&
              "border-blue-500 bg-blue-500 text-white",
            step.status === "pending" &&
              "border-gray-300 bg-white text-gray-400",
            step.status === "error" &&
              "border-red-500 bg-red-500 text-white"
          )}
        >
          {step.status === "completed" && <Check className="h-5 w-5" />}
          {step.status === "active" && (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          {step.status === "pending" && (
            <span className="text-sm font-medium">{index + 1}</span>
          )}
          {step.status === "error" && <X className="h-5 w-5" />}
        </div>

        {/* Label */}
        <span
          className={clsx(
            "mt-2 text-xs font-medium",
            step.status === "active" && "text-blue-600",
            step.status === "completed" && "text-green-600",
            step.status === "pending" && "text-gray-400",
            step.status === "error" && "text-red-600"
          )}
        >
          {step.label}
        </span>
      </div>

      {/* Connector line */}
      {isLast && (
        <div
          className={clsx(
            "h-0.5 w-full flex-1",
            step.status === "completed" ? "bg-green-500" : "bg-gray-200"
          )}
        />
      )}
    </React.Fragment>
  );
}

function AuditProgress({ steps, error }: AuditProgressProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Progression de l&apos;audit
      </h3>

      {/* Steps */}
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <StepItem step={step} index={index} />
          </React.Fragment>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

export { AuditProgress };