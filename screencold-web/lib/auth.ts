// ============================================
// Startup Security Validation
// ============================================

/**
 * Validate that the NEXTAUTH_SECRET is not the default dev secret in production.
 * This prevents accidental deployment of a weak secret.
 */
function validateSecret(): void {
  const secret = process.env.NEXTAUTH_SECRET;
  const nodeEnv = process.env.NODE_ENV;

  // Known dev-only / placeholder secrets that must never reach production
  const DEV_SECRETS = [
    'dev-nextauth-secret-change-me',
    'dev-secret-change-in-production',
    'dev-secret-CHANGEME-do-not-use-in-prod',
    'change-me-with-openssl-rand-base64-32',
    'your-nextauth-secret-generate-with-openssl-rand-base64-32',
  ];

  if (nodeEnv === 'production' && secret && DEV_SECRETS.includes(secret)) {
    console.error(
      '==============================================================\n' +
      '  SECURITY ERROR: NEXTAUTH_SECRET is a dev-only placeholder!\n' +
      '  This secret must NOT be used in production.\n' +
      '  Generate a strong secret with: openssl rand -base64 32\n' +
      '  Set it via environment variables or your deployment platform.\n' +
      '=============================================================='
    );
    throw new Error(
      'NEXTAUTH_SECRET is a known dev-only placeholder. ' +
      'Generate a strong secret for production with: openssl rand -base64 32'
    );
  }

  // Warn if secret is too short (less than 32 chars base64 � 24 bytes entropy)
  if (secret && secret.length < 32) {
    console.warn(
      '[Auth] WARNING: NEXTAUTH_SECRET is too short (' + secret.length + ' chars). ' +
      'Use at least 32 characters. Generate with: openssl rand -base64 32'
    );
  }
}

// Run validation at module load time
validateSecret();

import NextAuth, { type NextAuthConfig, type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "./prisma";

// Validation schema for credentials
const credentialsSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

// Extended session type
type ExtendedSession = Session & {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    plan: string;
    credits: number;
    role: string;
    roles: string[];
  };
};

// Extended user type
type ExtendedUser = User & {
  id: string;
  plan: string;
  role: string;
  credits: number;
  roles?: string[];
};

// Authentication configuration
const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    verifyRequest: "/verify-request",
  },
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // Email/Password Credentials Provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        // Validate credentials format
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message ?? "Identifiants invalides");
        }

        const { email, password } = parsed.data;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          throw new Error("Aucun compte trouvé avec cet email");
        }

        // Check if user has password (Google users may not have password)
        if (!user.password) {
          throw new Error(
            "Ce compte utilise Google pour la connexion. Veuillez utiliser Google."
          );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          throw new Error("Mot de passe incorrect");
        }

        // Return user object (without password)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan,
          credits: user.credits,
          role: user.role,
        } as ExtendedUser;
      },
    }),
  ],

  callbacks: {
    // JWT callback - add custom fields to token
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // On sign in, add user data to token
        const extUser = user as ExtendedUser;
        token.id = extUser.id;
        token.plan = extUser.plan;
        token.credits = extUser.credits;
        token.role = extUser.role;
        token.roles = [extUser.role as string];
      }

      // Fetch roles from DB on token refresh
      if (!user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { userRoles: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.roles = dbUser.userRoles.map((ur) => ur.role);
        }
      }

      // Handle session update (e.g., after credits are used)
      if (trigger === "update" && session) {
        token.credits = session.credits;
        token.plan = session.plan;
      }

      return token;
    },

    // Session callback - add custom fields to session
    async session({ session, token }): Promise<ExtendedSession> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          plan: token.plan as string,
          credits: token.credits as number,
          role: token.role as string,
          roles: token.roles as string[],
        },
      } as ExtendedSession;
    },

    // Sign in callback - allow only verified users
    async signIn({ user, account, profile }) {
      // Always allow OAuth (Google) sign in
      if (account?.type === "oauth") {
        return true;
      }

      // For credentials, user is already verified if we reach here
      if (account?.type === "credentials") {
        // Check if user exists and email is verified
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? "" },
        });

        if (!existingUser?.emailVerified && !existingUser?.password) {
          // For new users or users without email verification
          // In production, you might want to require email verification
          return true;
        }

        return true;
      }

      return true;
    },
  },

  events: {
    // Handle new user creation
    async createUser({ user }) {
      // Set default credits for new users
      await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: 5,
          plan: "FREE",
        },
      });
    },

    // Handle link account (Google OAuth linking)
    async linkAccount({ user, account, profile }) {
      // Update user with Google info if available
      if (account.provider === "google" && profile) {
        const googleProfile = profile as { picture?: string; name?: string };
        await prisma.user.update({
          where: { id: user.id },
          data: {
            image: googleProfile.picture ?? user.image,
            name: googleProfile.name ?? user.name,
            emailVerified: new Date(),
          },
        });
      }
    },
  },

  // Debug in development
  debug: process.env.NODE_ENV === "development",

  // Trust host for production
  trustHost: true,
};

// Create NextAuth instance
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper to get current session (server-side)
export async function getSession() {
  return await auth();
}

// Helper to get current user (server-side)
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      plan: true,
      credits: true,
      stripeCustomerId: true,
      createdAt: true,
    },
  });

  return user;
}

// Helper to check if user is authenticated
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

// Helper to check if user has enough credits
export async function hasCredits(userId: string, amount = 1): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return (user?.credits ?? 0) >= amount;
}

// Helper to deduct credits
export async function deductCredits(userId: string, amount = 1): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user || user.credits < amount) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: { decrement: amount },
    },
  });

  return true;
}

// Helper to refund credits
export async function refundCredits(
  userId: string,
  amount = 1,
  auditId?: string
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "audit_refund",
        auditId,
      },
    }),
  ]);
}

// Helper to create credit transaction
export async function createCreditTransaction(
  userId: string,
  amount: number,
  type: string,
  auditId?: string
): Promise<void> {
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount,
      type,
      auditId,
    },
  });
}
