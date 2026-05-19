import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Papa from 'papaparse';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';
import { getCSVLimit } from '@/lib/plans';

// ============================================
// Types
// ============================================

interface CSVRow {
  url?: string;
  URL?: string;
  company_name?: string;
  companyName?: string;
  company?: string;
  contact_name?: string;
  contactName?: string;
  name?: string;
  contact_email?: string;
  contactEmail?: string;
  email?: string;
  notes?: string;
  Notes?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ============================================
// Validation Schema
// ============================================

const importSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
  campaignId: z.string().min(1, 'Campaign ID is required'),
});

// ============================================
// URL Validation Helper
// ============================================

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Block private IPs, localhost, etc.
    const hostname = urlObj.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
      /^169\.254\.169\.254$/,
      /\.internal$/,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// Extract URL from row (flexible column names)
// ============================================

function extractUrl(row: CSVRow): string | null {
  return row.url || row.URL || null;
}

function extractCompanyName(row: CSVRow): string | null {
  return row.company_name || row.companyName || row.company || null;
}

function extractContactName(row: CSVRow): string | null {
  return row.contact_name || row.contactName || row.name || null;
}

function extractContactEmail(row: CSVRow): string | null {
  const email = row.contact_email || row.contactEmail || row.email || null;
  if (!email) return null;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}

function extractNotes(row: CSVRow): string | null {
  return row.notes || row.Notes || null;
}

// ============================================
// POST /api/campaigns/[id]/prospects - Import from CSV
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id: campaignId } = await params;

    // Verify campaign exists and ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, userId: true, prospectsList: { select: { id: true } } },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Campagne non trouvée' },
        { status: 404 }
      );
    }

    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n\'avez pas accès à cette campagne' },
        { status: 403 }
      );
    }

    // Get user's plan to check CSV limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const csvLimit = getCSVLimit(user.plan);

    // Check current prospect count
    const currentCount = campaign.prospectsList.length;

    if (csvLimit !== -1 && currentCount >= csvLimit) {
      return NextResponse.json(
        {
          error: 'CSV_LIMIT_REACHED',
          message: `Limite de ${csvLimit} prospects atteinte. Upgradez pour importer plus.`,
          csvLimit,
          currentCount,
        },
        { status: 400 }
      );
    }

    // Parse body
    const body = await request.json();
    const validationResult = importSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { csv } = validationResult.data;

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      const criticalErrors = parseResult.errors.filter(
        (e) => e.type === 'Quotes' || e.type === 'FieldMismatch'
      );

      if (criticalErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'CSV_PARSE_ERROR',
            message: 'Erreur lors du parsing du CSV',
            details: criticalErrors.map((e) => e.message),
          },
          { status: 400 }
        );
      }
    }

    const rows = parseResult.data;
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Check if adding these rows would exceed limit
    const availableSlots = csvLimit === -1 ? Infinity : csvLimit - currentCount;
    const rowsToProcess = rows.slice(0, availableSlots);

    if (rows.length > availableSlots) {
      result.errors.push(`${rows.length - availableSlots} lignes ignorées (limite de ${csvLimit} prospects)`);
    }

    // Create prospects in batches
    const BATCH_SIZE = 50;
    const prospectsToCreate: {
      url: string;
      companyName: string | null;
      contactName: string | null;
      contactEmail: string | null;
      notes: string | null;
      campaignId: string;
      status: 'PENDING';
    }[] = [];

    for (const row of rowsToProcess) {
      const url = extractUrl(row);

      if (!url) {
        result.skipped++;
        continue;
      }

      if (!isValidUrl(url)) {
        result.skipped++;
        result.errors.push(`URL invalide: ${url}`);
        continue;
      }

      prospectsToCreate.push({
        url,
        companyName: extractCompanyName(row),
        contactName: extractContactName(row),
        contactEmail: extractContactEmail(row),
        notes: extractNotes(row),
        campaignId,
        status: 'PENDING',
      });
    }

    // Batch insert prospects
    if (prospectsToCreate.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < prospectsToCreate.length; i += BATCH_SIZE) {
          const batch = prospectsToCreate.slice(i, i + BATCH_SIZE);
          await tx.prospect.createMany({
            data: batch,
          });
          result.imported += batch.length;
        }
      });

      console.log(`[CSV Import] campaign=${campaignId}, imported=${result.imported}, skipped=${result.skipped}`);
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      total: result.imported + result.skipped,
      remainingSlots: csvLimit === -1 ? 'unlimited' : Math.max(0, csvLimit - currentCount - result.imported),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[Campaign/Prospects] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/campaigns/[id]/prospects - List prospects
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, userId: true },
    });

    if (!campaign || campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Campagne non trouvée' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');

    const where = { campaignId };
    if (status) {
      Object.assign(where, { status: status as 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' });
    }

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        include: {
          audit: {
            select: {
              id: true,
              status: true,
              overallScore: true,
              screenshotUrl: true,
              annotatedUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.prospect.count({ where }),
    ]);

    return NextResponse.json({
      prospects: prospects.map((p) => ({
        id: p.id,
        url: p.url,
        companyName: p.companyName,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        notes: p.notes,
        status: p.status,
        createdAt: p.createdAt,
        audit: p.audit,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Campaign/Prospects] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}