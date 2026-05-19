import { z } from "zod";

// Password validation with specific requirements
const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(100, "Le mot de passe ne peut pas dépasser 100 caractères")
  .refine(
    (password) => {
      // At least one uppercase letter
      return /[A-Z]/.test(password);
    },
    { message: "Le mot de passe doit contenir au moins une majuscule" }
  )
  .refine(
    (password) => {
      // At least one lowercase letter
      return /[a-z]/.test(password);
    },
    { message: "Le mot de passe doit contenir au moins une minuscule" }
  )
  .refine(
    (password) => {
      // At least one number
      return /\d/.test(password);
    },
    { message: "Le mot de passe doit contenir au moins un chiffre" }
  )
  .refine(
    (password) => {
      // At least one special character
      return /[!@#$%^&*(),.?":{}|<>]/.test(password);
    },
    { message: "Le mot de passe doit contenir au moins un caractère spécial" }
  );

// Email validation
const emailSchema = z
  .string()
  .email("Email invalide")
  .max(255, "L'email ne peut pas dépasser 255 caractères")
  .toLowerCase();

// Registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: "Vous devez accepter les conditions d'utilisation",
    }),
  acceptMarketing: z.boolean().optional().default(false),
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est requis"),
  rememberMe: z.boolean().optional().default(false),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: passwordSchema,
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: passwordSchema,
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "Le nouveau mot de passe doit être différent de l'actuel",
    path: ["newPassword"],
  }
);

// Update profile schema
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  image: z.string().url("URL d'image invalide").optional(),
});

// Update email schema
export const updateEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis pour changer l'email"),
});

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token requis"),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  email: emailSchema,
  subject: z
    .string()
    .min(5, "Le sujet doit contenir au moins 5 caractères")
    .max(255, "Le sujet ne peut pas dépasser 255 caractères"),
  message: z
    .string()
    .min(20, "Le message doit contenir au moins 20 caractères")
    .max(5000, "Le message ne peut pas dépasser 5000 caractères"),
});

// Subscription upgrade schema
export const upgradeSubscriptionSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "AGENCY"]),
  successUrl: z.string().url("URL de succès invalide"),
  cancelUrl: z.string().url("URL d'annulation invalide"),
});

// Cancel subscription schema
export const cancelSubscriptionSchema = z.object({
  reason: z
    .string()
    .max(500, "La raison ne peut pas dépasser 500 caractères")
    .optional(),
  feedback: z.string().max(1000).optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type UpgradeSubscriptionInput = z.infer<typeof upgradeSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push("Au moins 8 caractères");

  if (password.length >= 12) score += 1;

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Au moins une majuscule");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Au moins une minuscule");

  if (/\d/.test(password)) score += 1;
  else feedback.push("Au moins un chiffre");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push("Au moins un caractère spécial");

  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push("Évitez les caractères répétés");
  }

  return {
    score: Math.max(0, Math.min(6, score)),
    feedback,
  };
}

// Validation helpers
export function validateRegister(data: unknown) {
  return registerSchema.safeParse(data);
}

export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}

export function validateForgotPassword(data: unknown) {
  return forgotPasswordSchema.safeParse(data);
}

export function validateResetPassword(data: unknown) {
  return resetPasswordSchema.safeParse(data);
}

export function validateChangePassword(data: unknown) {
  return changePasswordSchema.safeParse(data);
}

export function validateUpdateProfile(data: unknown) {
  return updateProfileSchema.safeParse(data);
}

export function validateContactForm(data: unknown) {
  return contactFormSchema.safeParse(data);
}