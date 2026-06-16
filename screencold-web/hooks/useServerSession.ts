"use client";

import { useState, useEffect } from "react";

/** Shape of the user object returned by the server session. */
export interface ServerSessionUser {
  id?: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  plan?: string;
  credits?: number;
  role?: string;
  roles?: string[];
}

export interface UseServerSessionResult {
  /** The session user, or null if not authenticated / still loading. */
  user: ServerSessionUser | null;
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
  /** True when a non-null user has been fetched. */
  isAuthenticated: boolean;
}

/**
 * Client-side hook that fetches the current session from `/api/auth/session`.
 *
 * Useful for client components that need session data without relying on the
 * NextAuth SessionProvider.
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated } = useServerSession();
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) redirect("/login");
 * ```
 */
export function useServerSession(): UseServerSessionResult {
  const [user, setUser] = useState<ServerSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");

        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        const data = (await res.json()) as {
          user?: ServerSessionUser | null;
        };

        if (!cancelled) {
          setUser(data?.user ?? null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    fetchSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
