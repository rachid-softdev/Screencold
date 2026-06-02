import * as React from "react";
import { clsx } from "clsx";

export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

function FormGroup({ className, label, error, helperText, children, id, ...props }: FormGroupProps) {
  const inputId = id || React.useId();

  return (
    <div className={clsx("w-full", className)} {...props}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}
      {React.isValidElement(children) && React.cloneElement(children as React.ReactElement<{ id?: string; error?: boolean }>, { id: inputId, error: !!error })}
      {error && (
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

export { FormGroup };