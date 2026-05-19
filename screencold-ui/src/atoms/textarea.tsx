import * as React from "react";
import { forwardRef } from "react";
import { clsx } from "clsx";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <textarea
        ref={ref}
        id={inputId}
        className={clsx(
          "flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm",
          "placeholder:text-gray-400",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-0",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
          className
        )}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };