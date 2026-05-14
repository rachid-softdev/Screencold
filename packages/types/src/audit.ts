// UX Issue types
export type IssueSeverity = "critical" | "major" | "minor";
export type IssueCategory =
  | "navigation"
  | "layout"
  | "typography"
  | "color"
  | "cta"
  | "trust"
  | "mobile"
  | "performance"
  | "accessibility";

export interface IssueZone {
  x: number;
  y: number;
  width: number;
  height: number;
  elementSelector?: string;
}

export interface UXIssue {
  id: string;
  type: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  recommendation: string;
  zone?: IssueZone;
  screenshotUrl?: string;
}

// Screenshot types
export interface ScreenshotResult {
  desktop: {
    url: string;
    path: string;
    width: number;
    height: number;
  };
  mobile?: {
    url: string;
    path: string;
    width: number;
    height: number;
  };
  annotated?: {
    url: string;
    path: string;
  };
}

// Capture result from Playwright
export interface CaptureResult {
  success: boolean;
  url: string;
  screenshots: ScreenshotResult;
  viewport: {
    desktop: { width: number; height: number };
    mobile: { width: number; height: number };
  };
  timestamp: string;
  error?: string;
  metadata?: {
    title?: string;
    description?: string;
    loadTime?: number;
    pageSize?: number;
  };
}

// Analysis result from AI
export interface AnalyzeResult {
  success: boolean;
  issues: UXIssue[];
  overallScore: number; // 0-100
  siteType: string;
  summary: string;
  strengths: string[];
  recommendations: string[];
  timestamp: string;
  error?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    analysisTime?: number;
  };
}

// Email generation result
export interface EmailResult {
  success: boolean;
  subject: string;
  body: string;
  ps?: string;
  tone: string;
  personalization?: {
    companyName?: string;
    contactName?: string;
    issueHighlight?: string;
  };
  timestamp: string;
  error?: string;
}

// Job data types for BullMQ
export interface AuditJobData {
  auditId: string;
  prospectId: string;
  userId: string;
  url: string;
  captureOnly?: boolean;
}

export interface ProspectJobData {
  campaignId: string;
  prospectId: string;
  userId: string;
  url: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}

export interface EmailJobData {
  auditId: string;
  prospectId: string;
  userId: string;
  contactName?: string;
  contactEmail: string;
  customMessage?: string;
}

// Job result types
export interface JobResult {
  success: boolean;
  jobId: string;
  data?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export interface AuditJobResult extends JobResult {
  auditId: string;
  screenshots?: ScreenshotResult;
  analysis?: AnalyzeResult;
}

export interface EmailJobResult extends JobResult {
  emailId: string;
  email?: EmailResult;
}

// Queue names
export const QUEUE_NAMES = {
  AUDIT: "audit",
  EMAIL: "email",
  CAMPAIGN: "campaign",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];