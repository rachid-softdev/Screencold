"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Search, ArrowRight } from "lucide-react";
import { Button } from '@screencold/ui';
import { useToast } from '@screencold/ui';

interface QuickAuditFormProps {
  onSubmit?: (url: string) => Promise<void>;
  disabled?: boolean;
}

function QuickAuditForm({ onSubmit, disabled }: QuickAuditFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateUrl = (value: string): boolean => {
    const trimmed = value.trim();

    if (!trimmed) {
      setError("Veuillez entrer une URL");
      return false;
    }

    // Check for obvious typos (no dots, no TLD)
    if (!trimmed.includes(".") && !trimmed.includes("://")) {
      setError("L'URL doit contenir un nom de domaine (ex : www.exemple.com)");
      return false;
    }

    try {
      const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      const parsedUrl = new URL(normalized);
      if (!parsedUrl.hostname.includes(".")) {
        setError("Le nom de domaine semble incomplet (ex : www.exemple.com)");
        return false;
      }
      setError("");
      return true;
    } catch {
      setError("Format d'URL incorrect. Vérifiez la saisie (ex : www.exemple.com)");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateUrl(url)) return;

    setLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(url);
      } else {
        // Navigate to new audit page with URL param
        const params = new URLSearchParams();
        params.set("url", url);
        router.push(`/audits/new?${params.toString()}`);
      }

      addToast("Audit lancé avec succès", "success");
      setUrl("");
    } catch (err) {
      addToast("Une erreur est survenue", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-info-600 p-6 sm:p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Analysez un site en quelques secondes
        </h2>
        <p className="mt-2 text-info-100">
          Entrez l'URL d'un site pour générer un audit complet et un email de
          prospection personnalisé.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) validateUrl(e.target.value);
                }}
                onBlur={() => url && validateUrl(url)}
                placeholder="www.exemple.com"
                disabled={loading || disabled}
                className={clsx(
                  "h-12 w-full rounded-lg border-0 bg-white pl-10 pr-4 text-neutral-900 placeholder:text-neutral-400",
                  "focus:outline-none focus:ring-2 focus:ring-white/50",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
            {error && (
              <p className="mt-1.5 text-sm text-warning-100">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={loading || disabled}
            className="h-12 bg-white text-info-700 hover:bg-info-50"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Analyser
          </Button>
        </div>
      </form>
    </div>
  );
}

export { QuickAuditForm };