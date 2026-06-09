"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Play } from "lucide-react";
import { Button } from '@screencold/ui';
import { Modal } from '@screencold/ui';
import { CampaignProgress } from "@/components/campaigns/campaign-progress";
import { ProspectTable } from "@/components/campaigns/prospect-table";
import { CSVImportForm } from "@/components/forms/csv-import-form";
import { useToast } from '@screencold/ui';

type ProspectStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

interface Prospect {
  id: string;
  url: string;
  companyName?: string;
  status: ProspectStatus;
  score?: number | null;
  createdAt: string;
}

function CampaignDetailPage() {
  const params = useParams();
  const { addToast } = useToast();
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [isLaunching, setIsLaunching] = React.useState(false);

  // Mock data - replace with actual data fetching based on params.id
  const campaign = {
    id: params.id,
    name: "Prospects Janvier 2024",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  };

  const prospects: Prospect[] = [
    { id: "1", url: "acme-corp.com", companyName: "Acme Corp", status: "DONE", score: 72, createdAt: new Date().toISOString() },
    { id: "2", url: "techstart.io", companyName: "TechStart", status: "DONE", score: 45, createdAt: new Date().toISOString() },
    { id: "3", url: "design.studio", companyName: "Design Studio", status: "PROCESSING", score: null, createdAt: new Date().toISOString() },
    { id: "4", url: "marketing-pro.fr", companyName: "Marketing Pro", status: "DONE", score: 88, createdAt: new Date().toISOString() },
    { id: "5", url: "web-agency.com", companyName: "Web Agency", status: "FAILED", score: null, createdAt: new Date().toISOString() },
    { id: "6", url: "seo-expert.net", companyName: "SEO Expert", status: "PENDING", score: null, createdAt: new Date().toISOString() },
    { id: "7", url: "digitalAgency.com", companyName: "Digital Agency", status: "PENDING", score: null, createdAt: new Date().toISOString() },
  ];

  const statusCounts = {
    done: prospects.filter((p) => p.status === "DONE").length,
    processing: prospects.filter((p) => p.status === "PROCESSING").length,
    failed: prospects.filter((p) => p.status === "FAILED").length,
    pending: prospects.filter((p) => p.status === "PENDING").length,
  };

  const handleViewAudit = (_prospect: Prospect) => {
    // Navigate to audit result if available
    addToast("Redirection vers l'audit...", "info");
  };

  const handleRetry = async (_prospect: Prospect) => {
    addToast("Relance de l'audit...", "info");
  };

  const handleDelete = (_prospect: Prospect) => {
    addToast("Prospect supprimé", "success");
  };

  const handleLaunchAudits = async () => {
    setIsLaunching(true);
    try {
      // Launch batch audits
      await new Promise((resolve) => setTimeout(resolve, 2000));
      addToast("Audits lancés avec succès", "success");
    } catch (err) {
      addToast("Erreur lors du lancement des audits", "error");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleImportSubmit = async (_campaignName: string, _file: File) => {
    // Handle CSV import
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setShowImportModal(false);
    addToast("Prospects importés avec succès", "success");
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux campagnes
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Créée le {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(campaign.createdAt))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(true)}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Importer CSV
          </Button>
          <Button
            onClick={handleLaunchAudits}
            loading={isLaunching}
            disabled={statusCounts.pending === 0}
            leftIcon={<Play className="h-4 w-4" />}
          >
            Lancer les audits ({statusCounts.pending})
          </Button>
        </div>
      </div>

      {/* Progress */}
      <CampaignProgress
        total={prospects.length}
        done={statusCounts.done}
        processing={statusCounts.processing}
        failed={statusCounts.failed}
        pending={statusCounts.pending}
        onLaunch={handleLaunchAudits}
      />

      {/* Prospects Table */}
      <ProspectTable
        prospects={prospects}
        onView={handleViewAudit}
        onRetry={handleRetry}
        onDelete={handleDelete}
      />

      {/* Import Modal */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importer des prospects"
      >
        <CSVImportForm onSubmit={handleImportSubmit} />
      </Modal>
    </div>
  );
}

export default CampaignDetailPage;