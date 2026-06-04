import { z } from "zod";

// URL validation helper
const urlSchema = z.string().url("URL invalide").or(
  z.string().min(1).refine(
    (val) => {
      try {
        const url = new URL(`https://${val}`);
        return url.hostname.includes(".");
      } catch {
        return false;
      }
    },
    { message: "URL invalide" }
  )
);

// Create audit schema
export const createAuditSchema = z.object({
  url: urlSchema,
  captureOnly: z.boolean().optional().default(false),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

// Create batch audit schema
export const createBatchAuditSchema = z.object({
  urls: z
    .array(urlSchema)
    .min(1, "Au moins une URL est requise")
    .max(100, "Maximum 100 URLs à la fois"),
  captureOnly: z.boolean().optional().default(false),
  campaignId: z.string().cuid().optional(),
  defaultContactEmail: z.string().email("Email invalide").optional(),
});

// Get audit schema
export const getAuditSchema = z.object({
  id: z.string().cuid("ID invalide"),
});

// Update audit schema (for adding email content)
export const updateAuditSchema = z.object({
  id: z.string().cuid("ID invalide"),
  emailSubject: z.string().max(255).optional(),
  emailBody: z.string().max(10000).optional(),
  emailPs: z.string().max(500).optional(),
});

// Delete audit schema
export const deleteAuditSchema = z.object({
  id: z.string().cuid("ID invalide"),
});

// List audits schema with pagination
export const listAuditsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PROCESSING", "READY", "FAILED"]).optional(),
  campaignId: z.string().cuid().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "overallScore"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Type exports
export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type CreateBatchAuditInput = z.infer<typeof createBatchAuditSchema>;
export type GetAuditInput = z.infer<typeof getAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
export type DeleteAuditInput = z.infer<typeof deleteAuditSchema>;
export type ListAuditsInput = z.infer<typeof listAuditsSchema>;

// Validation helper
export function validateCreateAudit(data: unknown) {
  return createAuditSchema.safeParse(data);
}

export function validateBatchAudit(data: unknown) {
  return createBatchAuditSchema.safeParse(data);
}

export function validateGetAudit(data: unknown) {
  return getAuditSchema.safeParse(data);
}

export function validateUpdateAudit(data: unknown) {
  return updateAuditSchema.safeParse(data);
}

export function validateListAudits(data: unknown) {
  return listAuditsSchema.safeParse(data);
}