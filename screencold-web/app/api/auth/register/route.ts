import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const registerSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

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

    const { name, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'USER_EXISTS', message: 'Un compte avec cet email existe déjà' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Stripe customer
    let stripeCustomerId: string | null = null;
    try {
      const customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: name,
        metadata: {
          source: 'screencold_registration',
        },
      });
      stripeCustomerId = customer.id;
    } catch (stripeError) {
      console.error('[Register] Failed to create Stripe customer:', stripeError);
      // Continue without Stripe customer - not critical for registration
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        plan: 'FREE',
        credits: 5,
        stripeCustomerId,
      },
    });

    // Create verification token
    const verificationToken = await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: crypto.randomUUID(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // TODO: Send verification email
    // For now, just return success

    return NextResponse.json(
      {
        message: 'Compte créé avec succès',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}