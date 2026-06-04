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

// Prospect schema for individual entries
export const prospectSchema = z.object({
  url: urlSchema,
  companyName: z.string().max(255).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

// Create campaign schema
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  prospects: z
    .array(prospectSchema)
    .min(1, "Au moins un prospect est requis")
    .max(500, "Maximum 500 prospects par campagne")
    .optional(),
});

// Update campaign schema
export const updateCampaignSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  addProspects: z
    .array(prospectSchema)
    .max(100, "Maximum 100 prospects à la fois")
    .optional(),
  removeProspectIds: z
    .array(z.string().cuid())
    .optional(),
});

// Import prospects schema (CSV data)
export const importProspectsSchema = z.object({
  campaignId: z.string().cuid("ID de campagne invalide"),
  prospects: z
    .array(prospectSchema)
    .min(1, "Au moins un prospect est requis")
    .max(1000, "Maximum 1000 prospects par import"),
  mode: z.enum(["add", "replace"]).default("add"),
});

// CSV row parsing schema
export const csvRowSchema = z.object({
  url: urlSchema,
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  notes: z.string().optional(),
});

// Parse CSV string to array
export function parseCSV(csvString: string): {
  success: boolean;
  rows: z.infer<typeof csvRowSchema>[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows: z.infer<typeof csvRowSchema>[] = [];

  // Split by newlines and handle different line endings
  const lines = csvString.split(/\r\n|\n|\r/);

  // Skip header row if present
  const dataLines = lines[0]?.toLowerCase().includes("url") ? lines.slice(1) : lines;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]?.trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields)
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    // Map fields (expecting: url, companyName, contactName, contactEmail, notes)
    const row = {
      url: fields[0] ?? "",
      companyName: fields[1] || undefined,
      contactName: fields[2] || undefined,
      contactEmail: fields[3] || undefined,
      notes: fields[4] || undefined,
    };

    // Validate the row
    const result = csvRowSchema.safeParse(row);
    if (result.success) {
      rows.push(result.data);
    } else {
      errors.push(`Ligne ${i + 2}: ${result.error.errors[0]?.message ?? "Invalid data"}`);
    }
  }

  return {
    success: errors.length === 0,
    rows,
    errors,
  };
}

// Get campaign schema
export const getCampaignSchema = z.object({
  id: z.string().cuid("ID invalide"),
});

// Delete campaign schema
export const deleteCampaignSchema = z.object({
  id: z.string().cuid("ID invalide"),
});

// List campaigns schema
export const listCampaignsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Get campaign prospects schema
export const getCampaignProspectsSchema = z.object({
  campaignId: z.string().cuid("ID de campagne invalide"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["PENDING", "PROCESSING", "DONE", "FAILED"]).optional(),
});

// Launch campaign schema
export const launchCampaignSchema = z.object({
  campaignId: z.string().cuid("ID de campagne invalide"),
  startFrom: z.coerce.number().int().min(0).default(0),
  parallelJobs: z.coerce.number().int().min(1).max(10).default(3),
});

// Type exports
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ImportProspectsInput = z.infer<typeof importProspectsSchema>;
export type GetCampaignInput = z.infer<typeof getCampaignSchema>;
export type DeleteCampaignInput = z.infer<typeof deleteCampaignSchema>;
export type ListCampaignsInput = z.infer<typeof listCampaignsSchema>;
export type GetCampaignProspectsInput = z.infer<typeof getCampaignProspectsSchema>;
export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;
export type ProspectInput = z.infer<typeof prospectSchema>;

// Validation helpers
export function validateCreateCampaign(data: unknown) {
  return createCampaignSchema.safeParse(data);
}

export function validateUpdateCampaign(data: unknown) {
  return updateCampaignSchema.safeParse(data);
}

export function validateImportProspects(data: unknown) {
  return importProspectsSchema.safeParse(data);
}

export function validateGetCampaign(data: unknown) {
  return getCampaignSchema.safeParse(data);
}

export function validateListCampaigns(data: unknown) {
  return listCampaignsSchema.safeParse(data);
}

export function validateLaunchCampaign(data: unknown) {
  return launchCampaignSchema.safeParse(data);
}