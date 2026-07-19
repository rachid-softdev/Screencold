import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * DEV-ONLY endpoint to obtain a real authenticated session cookie.
 *
 * NextAuth v4 has no server-side `signIn`, so we reuse the app's own auth
 * configuration (secret + session maxAge) to mint a genuine JWT session cookie
 * for a known dev user. The cookie is validated by `getServerSession(authOptions)`
 * exactly like a normal credentials sign-in.
 *
 * Usage (dev):  POST /api/dev/login  ->  capture the `Set-Cookie` response header.
 */
const DEV_EMAIL = "dev@local.dev";
const DEV_PASSWORD = "dev-password-123";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  const devUser = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: { password: passwordHash },
    create: {
      email: DEV_EMAIL,
      name: "Dev User",
      password: passwordHash,
      userRoles: {
        create: [{ role: "ADMIN" }],
      },
    },
  });

  const secret = (authOptions.secret as string) ?? process.env.NEXTAUTH_SECRET!;
  const maxAge = (authOptions.session?.maxAge as number) ?? 30 * 24 * 60 * 60;

  const token = await encode({
    secret,
    token: {
      name: devUser.name,
      email: devUser.email,
      sub: devUser.id,
      id: devUser.id,
    },
    maxAge,
  });

  const res = NextResponse.json({ ok: true, email: DEV_EMAIL });
  res.cookies.set("next-auth.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });
  return res;
}
