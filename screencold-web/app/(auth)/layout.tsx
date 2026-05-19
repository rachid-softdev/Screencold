import * as React from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900">ScreenCold</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-gray-200">
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-gray-500">
        © 2024 ScreenCold. Tous droits réservés.
      </p>
    </div>
  );
}

export default AuthLayout;