"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Building2, User, Mail, Globe, ArrowRight } from "lucide-react";
import { Button } from '@screencold/ui';
import { Input } from '@screencold/ui';
import { useToast } from '@screencold/ui';
import { AuditProgress } from "@/components/audit/audit-progress";
import { z } from "zod";

const agencyTypes = [
  { value: "seo", label: "Agence SEO" },
  { value: "webdesign", label: "Agence Web Design" },
  { value: "marketing", label: "Agence Marketing Digital" },
  { value: "communication", label: "Agence de Communication" },
  { value: "other", label: "Autre" },
];

const auditFormSchema = z.object({
  url: z.string().url("URL invalide"),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  agencyType: z.string().optional(),
});

type AuditFormData = z.infer<typeof auditFormSchema>;

type StepStatus = "pending" | "active" | "completed" | "error";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

function AuditForm({ onSubmit, isLoading }: { onSubmit?: (data: AuditFormData) => Promise<void>; isLoading?: boolean }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<AuditFormData>({
    url: "",
    companyName: "",
    contactName: "",
    contactEmail: "",
    agencyType: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AuditFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const steps: Step[] = [
    { id: "capture", label: "Capture", status: "pending" },
    { id: "analysis", label: "Analyse", status: "pending" },
    { id: "annotation", label: "Annotation", status: "pending" },
    { id: "email", label: "Email", status: "pending" },
  ];

  const [progressSteps, setProgressSteps] = useState<Step[]>(steps);

  const updateStep = (stepId: string, status: StepStatus) => {
    setProgressSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const validateForm = (): boolean => {
    try {
      auditFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof AuditFormData, string>> = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as keyof AuditFormData;
          newErrors[field] = error.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Show progress simulation
        setShowProgress(true);
        
        // Simulate progress
        updateStep("capture", "active");
        await new Promise((r) => setTimeout(r, 1000));
        updateStep("capture", "completed");
        
        updateStep("analysis", "active");
        await new Promise((r) => setTimeout(r, 1500));
        updateStep("analysis", "completed");
        
        updateStep("annotation", "active");
        await new Promise((r) => setTimeout(r, 1000));
        updateStep("annotation", "completed");
        
        updateStep("email", "active");
        await new Promise((r) => setTimeout(r, 800));
        updateStep("email", "completed");

        addToast("Audit créé avec succès", "success");
        
        // Navigate to dashboard or results
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    } catch (err) {
      addToast("Une erreur est survenue lors de la création de l'audit", "error");
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AuditFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (showProgress) {
    return (
      <div className="max-w-md mx-auto">
        <AuditProgress steps={progressSteps} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Field */}
      <div className="relative">
        <div className="absolute left-3 top-3 text-neutral-400">
          <Globe className="h-5 w-5" />
        </div>
        <Input
          type="text"
          value={formData.url}
          onChange={handleChange("url")}
          placeholder="www.exemple.com"
          error={errors.url}
          className="pl-10"
        />
      </div>

      {/* Company Name */}
      <Input
        type="text"
        value={formData.companyName}
        onChange={handleChange("companyName")}
        placeholder="Nom de l'entreprise (optionnel)"
        leftIcon={<Building2 className="h-4 w-4" />}
      />

      {/* Contact Name */}
      <Input
        type="text"
        value={formData.contactName}
        onChange={handleChange("contactName")}
        placeholder="Nom du contact (optionnel)"
        leftIcon={<User className="h-4 w-4" />}
      />

      {/* Contact Email */}
      <Input
        type="email"
        value={formData.contactEmail}
        onChange={handleChange("contactEmail")}
        placeholder="Email du contact (optionnel)"
        error={errors.contactEmail}
        leftIcon={<Mail className="h-4 w-4" />}
      />

      {/* Agency Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Type d&apos;agence
        </label>
        <select
          value={formData.agencyType}
          onChange={handleChange("agencyType")}
          className={clsx(
            "flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-info-200 focus:border-info-500"
          )}
        >
          <option value="">Sélectionnez (optionnel)</option>
          {agencyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={isSubmitting || isLoading}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Lancer l&apos;audit
      </Button>

      <p className="text-xs text-center text-neutral-500">
        1 crédit sera déduit de votre solde pour cet audit.
      </p>
    </form>
  );
}

export { AuditForm };