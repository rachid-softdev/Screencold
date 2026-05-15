import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

// Validation schema
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

// GET /api/email-templates - List user's templates
export async function GET(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    // Get user's templates and global templates
    const templates = await prisma.emailTemplate.findMany({
      where: {
        OR: [
          { userId },
          { userId: null, isActive: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[Email Templates] GET error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/email-templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, subject, body: templateBody, variables, isDefault } = validationResult.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        description,
        subject,
        body: templateBody,
        variables: variables ?? ['contactName', 'companyName'],
        isDefault: isDefault ?? false,
        userId,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('[Email Templates] POST error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/email-templates/:id - Update a template
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const validationResult = updateTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data' },
        { status: 400 }
      );
    }

    // Verify ownership
    const template = await prisma.emailTemplate.findFirst({
      where: { id, OR: [{ userId }, { userId: null }] },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.userId !== null && template.userId !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You can only edit your own templates' },
        { status: 403 }
      );
    }

    const { name, description, subject, body: templateBody, variables, isDefault, isActive } = validationResult.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(subject && { subject }),
        ...(templateBody && { body: templateBody }),
        ...(variables && { variables }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('[Email Templates] PATCH error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-templates/:id - Delete a template
export async function DELETE(
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

    const { id } = await params;

    // Verify ownership
    const template = await prisma.emailTemplate.findFirst({
      where: { id, userId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Template not found or cannot be deleted' },
        { status: 404 }
      );
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Email Templates] DELETE error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}