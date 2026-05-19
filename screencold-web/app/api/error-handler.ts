/**
 * Global API Error Handler
 * Provides consistent error responses across the API
 */

import { NextRequest, NextResponse } from 'next/server';

// Custom error types with user-friendly messages
const ERROR_MESSAGES: Record<string, { message: string; userMessage: string }> = {
  // Auth errors
  UNAUTHORIZED: {
    message: 'Authentication required',
    userMessage: 'Vous devez être connecté pour accéder à cette ressource.',
  },
  FORBIDDEN: {
    message: 'Access denied',
    userMessage: 'Vous n\'avez pas l\'autorisation d\'accéder à cette ressource.',
  },
  
  // Resource errors
  NOT_FOUND: {
    message: 'Resource not found',
    userMessage: 'La ressource demandée n\'existe pas.',
  },
  ALREADY_EXISTS: {
    message: 'Resource already exists',
    userMessage: 'Cette ressource existe déjà.',
  },
  
  // Credit errors
  NO_CREDITS: {
    message: 'Insufficient credits',
    userMessage: 'Vous n\'avez plus de crédits. Upgradez votre plan pour continuer.',
  },
  CREDIT_DEBIT_FAILED: {
    message: 'Failed to debit credits',
    userMessage: 'Impossible de débiter les crédits. Veuillez réessayer.',
  },
  
  // Validation errors
  VALIDATION_ERROR: {
    message: 'Invalid request data',
    userMessage: 'Les données envoyées sont invalides. Veuillez vérifier vos champs.',
  },
  INVALID_URL: {
    message: 'Invalid URL',
    userMessage: 'L\'URL fournie est invalide ou inaccessible.',
  },
  INVALID_EMAIL: {
    message: 'Invalid email address',
    userMessage: 'L\'adresse email fournie est invalide.',
  },
  
  // Rate limiting
  RATE_LIMITED: {
    message: 'Rate limit exceeded',
    userMessage: 'Trop de requêtes. Veuillez patienter quelques instants.',
  },
  
  // Plan/Feature errors
  PLAN_REQUIRED: {
    message: 'Plan upgrade required',
    userMessage: 'Cette fonctionnalité nécessite un plan supérieur.',
  },
  CSV_LIMIT_REACHED: {
    message: 'CSV import limit reached',
    userMessage: 'Vous avez atteint la limite d\'import pour votre plan.',
  },
  
  // Email errors
  EMAIL_FAILED: {
    message: 'Failed to send email',
    userMessage: 'Impossible d\'envoyer l\'email. Veuillez réessayer.',
  },
  EMAIL_NOT_CONFIGURED: {
    message: 'Email not configured',
    userMessage: 'L\'envoi d\'emails n\'est pas configuré. Veuillez vérifier vos paramètres.',
  },
  
  // Integration errors
  INTEGRATION_NOT_FOUND: {
    message: 'Integration not found',
    userMessage: 'L\'intégration n\'est pas configurée.',
  },
  INTEGRATION_EXPIRED: {
    message: 'Integration expired',
    userMessage: 'L\'intégration a expiré. Veuillez la reconfigurer.',
  },
  
  // Server errors
  INTERNAL_ERROR: {
    message: 'Internal server error',
    userMessage: 'Une erreur inattendue est survenue. Notre équipe a été informée.',
  },
  DATABASE_ERROR: {
    message: 'Database error',
    userMessage: 'Erreur de base de données. Veuillez réessayer.',
  },
  EXTERNAL_SERVICE_ERROR: {
    message: 'External service error',
    userMessage: 'Un service externe ne répond pas. Veuillez réessayer plus tard.',
  },
};

/**
 * Format error response
 */
export function formatErrorResponse(
  errorCode: string,
  details?: Record<string, unknown>
): NextResponse {
  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.INTERNAL_ERROR;
  
  const response: Record<string, unknown> = {
    error: errorCode,
    message: errorInfo.userMessage,
  };
  
  // Add details in development
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }
  
  const statusCode = getStatusCode(errorCode);
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(errorCode: string): number {
  const statusMap: Record<string, number> = {
    // 4xx Client errors
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    ALREADY_EXISTS: 409,
    VALIDATION_ERROR: 400,
    INVALID_URL: 400,
    INVALID_EMAIL: 400,
    RATE_LIMITED: 429,
    PLAN_REQUIRED: 403,
    CSV_LIMIT_REACHED: 400,
    NO_CREDITS: 402,
    CREDIT_DEBIT_FAILED: 402,
    EMAIL_FAILED: 500,
    EMAIL_NOT_CONFIGURED: 400,
    INTEGRATION_NOT_FOUND: 404,
    INTEGRATION_EXPIRED: 401,
    
    // 5xx Server errors
    INTERNAL_ERROR: 500,
    DATABASE_ERROR: 500,
    EXTERNAL_SERVICE_ERROR: 503,
  };
  
  return statusMap[errorCode] || 500;
}

/**
 * Handle errors in API routes with proper logging
 */
export async function handleApiError(
  error: unknown,
  context: string
): Promise<NextResponse> {
  // Log error details
  console.error(`[API Error] ${context}:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });
  
  // Check if it's a known error type
  if (error instanceof ApiError) {
    return formatErrorResponse(error.code, error.details);
  }
  
  // Check for Prisma errors
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    return formatErrorResponse('DATABASE_ERROR');
  }
  
  // Check for validation errors (Zod)
  if (error instanceof Error && error.name === 'ZodError') {
    return formatErrorResponse('VALIDATION_ERROR');
  }
  
  // Default to internal error
  return formatErrorResponse('INTERNAL_ERROR');
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message?: string,
    public details?: Record<string, unknown>
  ) {
    super(message || ERROR_MESSAGES[code]?.message || 'Unknown error');
    this.name = 'ApiError';
  }
}

/**
 * Wrap async route handlers with error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>,
  context: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}