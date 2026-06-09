import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, isEncrypted } from "./encryption";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

// Base client (cached globally to prevent multiple instances in dev)
const basePrisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = basePrisma;
}

// ============================================
// OAuth Token Encryption Extension
// Transparently encrypts/decrypts OAuth tokens
// stored in the Account model via Prisma middleware.
// ============================================
function maybeDecryptToken(value: string | null): string | null {
  if (!value) return value;
  // Lazy migration: if not in encrypted format, return as-is
  if (!isEncrypted(value)) return value;
  return decrypt(value);
}

function encryptToken(value: string | undefined | null): string | undefined | null {
  if (!value) return value;
  return encrypt(value);
}

const prisma = basePrisma.$extends({
  query: {
    account: {
      // Intercept create to encrypt tokens before storage
      async create({ args, query }) {
        const data = args.data as Record<string, unknown>;
        if (data.access_token) {
          data.access_token = encryptToken(data.access_token as string);
        }
        if (data.refresh_token) {
          data.refresh_token = encryptToken(data.refresh_token as string);
        }
        if (data.id_token) {
          data.id_token = encryptToken(data.id_token as string);
        }
        return query(args);
      },

      // Intercept update to encrypt tokens before storage
      async update({ args, query }) {
        const data = args.data as Record<string, unknown>;
        if (data.access_token !== undefined) {
          if (typeof data.access_token === "string") {
            data.access_token = encryptToken(data.access_token);
          } else if (
            data.access_token &&
            typeof data.access_token === "object" &&
            "set" in (data.access_token as Record<string, unknown>)
          ) {
            const ops = data.access_token as Record<string, unknown>;
            if (typeof ops.set === "string") {
              ops.set = encryptToken(ops.set);
            }
          }
        }
        if (data.refresh_token !== undefined) {
          if (typeof data.refresh_token === "string") {
            data.refresh_token = encryptToken(data.refresh_token);
          } else if (
            data.refresh_token &&
            typeof data.refresh_token === "object" &&
            "set" in (data.refresh_token as Record<string, unknown>)
          ) {
            const ops = data.refresh_token as Record<string, unknown>;
            if (typeof ops.set === "string") {
              ops.set = encryptToken(ops.set);
            }
          }
        }
        if (data.id_token !== undefined) {
          if (typeof data.id_token === "string") {
            data.id_token = encryptToken(data.id_token);
          } else if (
            data.id_token &&
            typeof data.id_token === "object" &&
            "set" in (data.id_token as Record<string, unknown>)
          ) {
            const ops = data.id_token as Record<string, unknown>;
            if (typeof ops.set === "string") {
              ops.set = encryptToken(ops.set);
            }
          }
        }
        return query(args);
      },

      // Intercept upsert to encrypt tokens
      async upsert({ args, query }) {
        const createData = args.create as Record<string, unknown>;
        if (createData.access_token) {
          createData.access_token = encryptToken(createData.access_token as string);
        }
        if (createData.refresh_token) {
          createData.refresh_token = encryptToken(createData.refresh_token as string);
        }
        if (createData.id_token) {
          createData.id_token = encryptToken(createData.id_token as string);
        }

        const updateData = args.update as Record<string, unknown>;
        if (updateData.access_token !== undefined) {
          if (typeof updateData.access_token === "string") {
            updateData.access_token = encryptToken(updateData.access_token);
          }
        }
        if (updateData.refresh_token !== undefined) {
          if (typeof updateData.refresh_token === "string") {
            updateData.refresh_token = encryptToken(updateData.refresh_token);
          }
        }
        if (updateData.id_token !== undefined) {
          if (typeof updateData.id_token === "string") {
            updateData.id_token = encryptToken(updateData.id_token);
          }
        }

        return query(args);
      },

      // Decrypt tokens when reading
      async findUnique({ args, query }) {
        const result = await query(args);
        if (result) {
          result.access_token = maybeDecryptToken(result.access_token);
          result.refresh_token = maybeDecryptToken(result.refresh_token);
          result.id_token = maybeDecryptToken(result.id_token);
        }
        return result;
      },

      // Decrypt tokens when reading
      async findFirst({ args, query }) {
        const result = await query(args);
        if (result) {
          result.access_token = maybeDecryptToken(result.access_token);
          result.refresh_token = maybeDecryptToken(result.refresh_token);
          result.id_token = maybeDecryptToken(result.id_token);
        }
        return result;
      },

      // Decrypt tokens when reading multiple records
      async findMany({ args, query }) {
        const results = await query(args);
        return results.map((result) => {
          result.access_token = maybeDecryptToken(result.access_token);
          result.refresh_token = maybeDecryptToken(result.refresh_token);
          result.id_token = maybeDecryptToken(result.id_token);
          return result;
        });
      },
    },
  },
});

export default prisma;
export { prisma };
