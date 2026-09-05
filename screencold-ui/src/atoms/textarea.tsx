"use client";

import * as React from "react";
import { forwardRef } from "react";
import { clsx } from "clsx";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean | string;
  helperText?: string;
  "aria-label"?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, "aria-label": ariaLabel, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && !ariaLabel && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            "flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm",
            "placeholder:text-gray-400",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            hasError
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-200",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
            className
          )}
          aria-label={ariaLabel}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={
            typeof error === "string" && error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />
        {typeof error === "string" && error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
