// Core domain types
export * from "./audit";
export * from "./campaign";
export * from "./user";
export * from "./blog";
export * from "./entitlements";

// Primitive types for job queues
export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  opts?: {
    attempts?: number;
    backoff?: {
      type: "exponential" | "fixed";
      delay?: number;
    };
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Environment validation
export interface Environment {
  DATABASE_URL: string;
  REDIS_URL: string;
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
}

// Feature flags
export interface FeatureFlags {
  enableAIAnalysis: boolean;
  enableEmailGeneration: boolean;
  enableScreenshotAnnotations: boolean;
  enableMobileView: boolean;
}