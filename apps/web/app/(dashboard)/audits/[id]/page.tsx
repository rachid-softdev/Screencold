"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { ScreenshotViewer } from "@/components/audit/screenshot-viewer";
import { ScoreGauge } from "@/components/audit/score-gauge";
import { IssueList } from "@/components/audit/issue-list";
import { EmailEditor } from "@/components/audit/email-editor";
import { useToast } from "@/components/ui/toast";

interface Issue {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  category: "SEO" | "PERFORMANCE" | "ACCESSIBILITY" | "UX" | "SECURITY" | "CONTENT";
  title: string;
  description: string;
  suggestion: string;
}

interface AuditData {
  id: string;
  status: string;
  screenshotUrl: string | null;
  annotatedUrl: string | null;
  mobileUrl: string | null;
  issues: Issue[];
  siteType: string | null;
  overallScore: number | null;
  emailSubject: string | null;
  emailBody: string | null;
  emailPs: string | null;
  errorMessage: string | null;
  processingTime: number | null;
  prospect: {
    id: string;
    url: string;
    companyName: string | null;
    contactName: string | null;
    contactEmail: string | null;
  };
}

function AuditResultPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"screenshot" | "annotated">("screenshot");
  const [audit, setAudit] = React.useState<AuditData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form state for email editing
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailBody, setEmailBody] = React.useState("");
  const [emailPs, setEmailPs] = React.useState("");

  // Fetch audit data on mount
  React.useEffect(() => {
    const auditId = params.id;
    if (!auditId) return;

    const fetchAudit = async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Erreur lors du chargement de l'audit");
        }
        const data = await response.json();
        setAudit(data);
        setEmailSubject(data.emailSubject || "");
        setEmailBody(data.emailBody || "");
        setEmailPs(data.emailPs || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [params.id]);

  const handleSaveEmail = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/audits/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSubject,
          emailBody,
          emailPs,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      addToast("Email enregistré avec succès", "success");
    } catch (err) {
      addToast("Erreur lors de la sauvegarde", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      // TODO: Implement actual regeneration via API when endpoint is ready
      await new Promise((resolve) => setTimeout(resolve, 2000));
      addToast("Fonctionnalité de régénération en cours de développement", "info");
    } catch (err) {
      addToast("Erreur lors de la régénération", "error");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadImage = () => {
    if (!audit?.screenshotUrl) return;
    
    // Create a temporary link to download the image
    const link = document.createElement("a");
    link.href = audit.screenshotUrl;
    link.download = `audit-${audit.prospect.companyName || "screenshot"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Téléchargement started", "success");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Chargement de l'audit...</p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-600 mb-4">{error || "Audit non trouvé"}</p>
        <Link href="/audits">
          <Button variant="secondary">Retour aux audits</Button>
        </Link>
      </div>
    );
  }

  const companyName = audit.prospect.companyName || "Entreprise";
  const websiteUrl = audit.prospect.url;

  // Handle processing state
  if (audit.status === "PROCESSING") {
    return (
      <div className="space-y-6">
        <Link
          href="/audits"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux audits
        </Link>

        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Audit en cours...</h2>
          <p className="text-gray-500 mt-2">
            Nous analysons actuellement {companyName}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Cette opération peut prendre quelques secondes
          </p>
        </div>
      </div>
    );
  }

  // Handle failed state
  if (audit.status === "FAILED") {
    return (
      <div className="space-y-6">
        <Link
          href="/audits"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux audits
        </Link>

        <div className="flex flex-col items-center justify-center py-20">
          <div className="rounded-full bg-red-100 p-4 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Échec de l'audit</h2>
          <p className="text-gray-500 mt-2 max-w-md text-center">
            {audit.errorMessage || "Une erreur est survenue lors de l'analyse du site"}
          </p>
          <Button 
            className="mt-6"
            onClick={() => router.push("/audits/new")}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/audits"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux audits
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {companyName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {websiteUrl}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={handleDownloadImage} 
            leftIcon={<Download className="h-4 w-4" />}
            disabled={!audit.screenshotUrl}
          >
            Télécharger
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleRegenerate} 
            leftIcon={<RefreshCw className="h-4 w-4" />} 
            loading={isRegenerating}
          >
            Régénérer
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Screenshot Viewer */}
        <div className="lg:col-span-3 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 w-fit bg-white">
            <button
              onClick={() => setViewMode("screenshot")}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                viewMode === "screenshot"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Capture
            </button>
            <button
              onClick={() => setViewMode("annotated")}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                viewMode === "annotated"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              )}
              disabled={!audit.annotatedUrl}
            >
              Annoté
            </button>
          </div>

          {viewMode === "screenshot" ? (
            <ScreenshotViewer
              desktopUrl={audit.screenshotUrl}
              mobileUrl={audit.mobileUrl}
              alt={companyName}
              isLoading={false}
              error={null}
            />
          ) : audit.annotatedUrl ? (
            <ScreenshotViewer
              desktopUrl={audit.annotatedUrl}
              alt={`${companyName} - Annoté`}
              isLoading={false}
              error={null}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-100 p-8 text-center">
              <p className="text-gray-500">Vue annotée non disponible</p>
            </div>
          )}
        </div>

        {/* Right Column - Score + Issues */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Gauge */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Score global</h3>
            <div className="flex justify-center">
              <ScoreGauge score={audit.overallScore ?? 0} size="lg" />
            </div>
            {audit.processingTime && (
              <p className="text-xs text-gray-400 mt-2">
                Temps d'analyse: {(audit.processingTime / 1000).toFixed(1)}s
              </p>
            )}
          </div>

          {/* Issues List */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Problèmes détectés ({audit.issues?.length || 0})
            </h3>
            {audit.issues && audit.issues.length > 0 ? (
              <IssueList issues={audit.issues} />
            ) : (
              <p className="text-gray-500 text-sm">Aucun problème majeur détecté</p>
            )}
          </div>

          {/* Site Type */}
          {audit.siteType && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Type de site</p>
              <p className="font-medium text-gray-900">{audit.siteType}</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Editor - Full Width */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          Email de prospection généré
        </h3>
        <EmailEditor
          subject={emailSubject}
          body={emailBody}
          ps={emailPs}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
          onSave={handleSaveEmail}
          isSaving={isSaving}
          onSubjectChange={setEmailSubject}
          onBodyChange={setEmailBody}
          onPsChange={setEmailPs}
        />
      </div>
    </div>
  );
}

export default AuditResultPage;