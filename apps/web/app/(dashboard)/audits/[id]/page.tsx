"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
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

function AuditResultPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"screenshot" | "annotated">("screenshot");

  // Mock data - replace with actual data fetching based on params.id
  const audit = {
    id: params.id,
    companyName: "Acme Corp",
    websiteUrl: "https://acme-corp.com",
    desktopUrl: null, // Would be real screenshot URL
    mobileUrl: null,
    annotatedUrl: null,
    overallScore: 67,
    status: "READY",
    emailSubject: "Amélioration de votre présence web - Analyse gratuite",
    emailBody: `Bonjour,

Je viens de réaliser un audit gratuit de votre site web et j'ai identifié plusieurs opportunités pour augmenter vos conversions.

Parmi les points clés :
• Votre temps de chargement pourrait être optimisé
• Certains éléments ne sont pas adaptés aux mobiles
• Des améliorations SEO pourraient booster votre visibilité

Je serais ravi de vous partager le rapport complet et de discuter de comment nous pourrions vous aider.

Seriez-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement`,
    emailPs: "P.S. : L'audit est gratuit et sans engagement. Je me permets cette approche car je suis convaincu que ces informations peuvent vraiment vous aider.",
    issues: [
      {
        id: "1",
        severity: "HIGH" as const,
        category: "PERFORMANCE" as const,
        title: "Temps de chargement lent",
        description: "Le site met plus de 3 secondes à charger complètement, ce qui peut impacter le taux de conversion et le référencement.",
        suggestion: "Compressez les images, minifiez le CSS/JS, et utilisez un CDN pour améliorer les performances.",
      },
      {
        id: "2",
        severity: "HIGH" as const,
        category: "ACCESSIBILITY" as const,
        title: "Contraste de couleurs insuffisant",
        description: "Certains textes n'ont pas un contraste suffisant avec leur fond, ce qui nuit à l'accessibilité.",
        suggestion: "Augmentez le contraste entre le texte et l'arrière-plan pour respecter les normes WCAG.",
      },
      {
        id: "3",
        severity: "MEDIUM" as const,
        category: "UX" as const,
        title: "Bouton CTA peu visible",
        description: "Le bouton d'action principal n'est pas assez mis en évidence.",
        suggestion: "Utilisez une couleur plus contrastée et augmentez la taille du bouton.",
      },
      {
        id: "4",
        severity: "LOW" as const,
        category: "SEO" as const,
        title: "Meta description manquante",
        description: " Certaines pages n'ont pas de meta description optimisée.",
        suggestion: "Ajoutez des meta descriptions uniques et pertinentes pour chaque page.",
      },
    ] as Issue[],
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      // Simulate regeneration
      await new Promise((resolve) => setTimeout(resolve, 2000));
      addToast("Email régénéré avec succès", "success");
    } catch (err) {
      addToast("Erreur lors de la régénération", "error");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadImage = () => {
    addToast("Fonctionnalité à venir", "info");
  };

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
            {audit.companyName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {audit.websiteUrl}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDownloadImage} leftIcon={<Download className="h-4 w-4" />}>
            Télécharger
          </Button>
          <Button variant="secondary" onClick={handleRegenerate} leftIcon={<RefreshCw className="h-4 w-4" />} loading={isRegenerating}>
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
            >
              Annoté
            </button>
          </div>

          {viewMode === "screenshot" ? (
            <ScreenshotViewer
              desktopUrl={audit.desktopUrl}
              mobileUrl={audit.mobileUrl}
              alt={audit.companyName}
              isLoading={audit.status === "PROCESSING"}
              error={audit.status === "FAILED" ? "Échec de la capture" : null}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-100 p-8 text-center">
              <p className="text-gray-500">Vue annotée (fonctionnalité à venir)</p>
            </div>
          )}
        </div>

        {/* Right Column - Score + Issues */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Gauge */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Score global</h3>
            <div className="flex justify-center">
              <ScoreGauge score={audit.overallScore} size="lg" />
            </div>
          </div>

          {/* Issues List */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Problèmes détectés ({audit.issues.length})
            </h3>
            <IssueList issues={audit.issues} />
          </div>
        </div>
      </div>

      {/* Email Editor - Full Width */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          Email de prospection généré
        </h3>
        <EmailEditor
          subject={audit.emailSubject}
          body={audit.emailBody}
          ps={audit.emailPs}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
        />
      </div>
    </div>
  );
}

export default AuditResultPage;