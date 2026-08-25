"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Application error
          </h2>
          <p className="text-gray-400 mb-6">
            {error.message || "A critical error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
