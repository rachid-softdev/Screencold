"use client";

import * as React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CookieConsent } from "@/components/cookie-consent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NextAuthSessionProvider>
        {children}
        <CookieConsent />
      </NextAuthSessionProvider>
    </ThemeProvider>
  );
}
