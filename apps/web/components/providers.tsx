"use client";

import * as React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { CookieConsent } from "@/components/cookie-consent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
      <CookieConsent />
    </NextAuthSessionProvider>
  );
}
