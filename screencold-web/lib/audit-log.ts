import prisma from "@/lib/prisma";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET"
  | "PLAN_CHANGE"
  | "CREDIT_PURCHASE"
  | "AUDIT_CREATED"
  | "AUDIT_COMPLETED"
  | "AUDIT_FAILED"
  | "CAMPAIGN_CREATED"
  | "CSV_IMPORTED"
  | "DATA_EXPORT"
  | "ACCOUNT_DELETE"
  | "SETTINGS_UPDATE";

interface AuditLogOptions {
  userId: string;
  action: AuditAction;
  resource?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function logAuditEvent({
  userId,
  action,
  resource,
  details,
  ip,
  userAgent,
}: AuditLogOptions) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId,
        action,
        resource,
        details: details || undefined,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    // Never let audit logging break the main flow
    console.error("[AuditLog] Failed to log event:", error);
  }
}

export async function getAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
  }
) {
  const where: Record<string, unknown> = { userId };
  if (options?.action) {
    where.action = options.action;
  }

  return prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
}
