import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Paths that require authentication
const PROTECTED_PATHS = [
  "/dashboard",
  "/audits",
  "/campaigns",
  "/settings",
  "/api/audit",
  "/api/campaign",
];

// Paths that should redirect to dashboard if authenticated
const AUTH_PATHS = ["/login", "/register", "/verify-request"];

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/blog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/faq",
];

// API paths that should be public
const PUBLIC_API_PATHS = [
  "/api/auth",
  "/api/webhooks",
  "/api/public",
];

export default auth((req: NextRequest & { auth: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // Files with extension
  ) {
    return NextResponse.next();
  }

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isPublicApiPath = PUBLIC_API_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  // Allow public paths
  if (isPublicPath || isPublicApiPath) {
    return NextResponse.next();
  }

  // Check authentication
  const session = req.auth;
  const isAuthenticated = !!session?.user;

  // Check if current path requires authentication
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  // Check if current path is auth path (login, register)
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth pages while authenticated
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // For API routes, return 401 if not authenticated
  if (pathname.startsWith("/api/") && !isAuthenticated && !isPublicApiPath) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
});

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

// Alternative matcher for more specific control
// export const config = {
//   matcher: [
//     "/dashboard/:path*",
//     "/audits/:path*",
//     "/campaigns/:path*",
//     "/settings/:path*",
//     "/api/audit/:path*",
//     "/api/campaign/:path*",
//   ],
// };