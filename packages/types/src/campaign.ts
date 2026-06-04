export enum ProspectStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  FAILED = "FAILED",
}

export enum AuditStatus {
  PROCESSING = "PROCESSING",
  READY = "READY",
  FAILED = "FAILED",
}

// Campaign with computed statistics
export interface CampaignWithStats {
  id: string;
  name: string;
  userId: string;
  prospects: string[];
  createdAt: Date;
  updatedAt: Date;
  stats: {
    total: number;
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
  prospectsList?: ProspectWithAudit[];
}

// Prospect with optional audit data
export interface ProspectWithAudit {
  id: string;
  url: string;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  campaignId: string;
  auditId: string | null;
  status: ProspectStatus;
  createdAt: Date;
  updatedAt: Date;
  audit?: {
    id: string;
    screenshotUrl: string | null;
    annotatedUrl: string | null;
    overallScore: number | null;
    emailSubject: string | null;
    emailBody: string | null;
    status: AuditStatus;
    createdAt: Date;
  } | null;
}

// CSV import row format
export interface CSVRow {
  url: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}

// CSV parsing result
export interface CSVParseResult {
  success: boolean;
  rows: CSVRow[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

// Campaign creation input
export interface CreateCampaignInput {
  name: string;
  prospects?: CSVRow[];
}

// Campaign update input
export interface UpdateCampaignInput {
  name?: string;
  addProspects?: CSVRow[];
  removeProspectIds?: string[];
}

// Bulk prospect status update
export interface BulkProspectUpdate {
  prospectIds: string[];
  status: ProspectStatus;
}

// Campaign export format
export interface CampaignExport {
  campaign: {
    id: string;
    name: string;
    createdAt: string;
  };
  exportedAt: string;
  prospects: Array<{
    url: string;
    companyName: string | null;
    contactName: string | null;
    contactEmail: string | null;
    status: ProspectStatus;
    auditScore: number | null;
    emailSubject: string | null;
    emailBody: string | null;
  }>;
}

// Campaign filter options
export interface CampaignFilter {
  status?: ProspectStatus;
  hasAudit?: boolean;
  minScore?: number;
  maxScore?: number;
  search?: string;
}

// Sort options for campaigns
export type CampaignSortField = "createdAt" | "name" | "updatedAt";
export type SortOrder = "asc" | "desc";

export interface CampaignSort {
  field: CampaignSortField;
  order: SortOrder;
}