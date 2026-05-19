import * as React from "react";
import { forwardRef } from "react";
import { clsx } from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm",
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

Input.displayName = "Input";

export { Input };