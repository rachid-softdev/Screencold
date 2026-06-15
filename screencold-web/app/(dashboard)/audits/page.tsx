"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, BarChart3, ArrowRight, Download, Trash2, CheckSquare } from "lucide-react";
import { Button, Badge, Input, Modal, useToast } from '@screencold/ui';
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Audit {
  id: string;
  companyName?: string;
  screenshotUrl?: string | null;
  overallScore?: number | null;
  status: string;
  createdAt: string;
  prospect?: {
    url: string;
  };
}

function AuditsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [audits, setAudits] = React.useState<Audit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = React.useState(false);

  const fetchAudits = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/audits?page=${page}&limit=20`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAudits(data.audits);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
      addToast("Impossible de charger les audits", "error");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAudits();
  }, []);

  const filteredAudits = audits.filter((audit) =>
    audit.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audit.prospect?.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreVariant = (score: number | null) => {
    if (score === null) return "default";
    if (score >= 70) return "success";
    if (score >= 40) return "warning";
    return "destructive";
  };

  const formatScore = (score: number | null) => {
    if (score === null) return "En cours";
    if (score >= 70) return `Bon : ${score}/100`;
    if (score >= 40) return `Moyen : ${score}/100`;
    return `Faible : ${score}/100`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  // --- Batch selection ---
  const allFilteredSelected = filteredAudits.length > 0 && filteredAudits.every((a) => selectedIds.has(a.id));
  const selectionCount = selectedIds.size;
  const showBatchBar = selectionCount > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const a of filteredAudits) next.delete(a.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const a of filteredAudits) next.add(a.id);
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());
  const [confirmAnalyse, setConfirmAnalyse] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Refs for keyboard handler to avoid stale closures
  const selectedIdsRef = React.useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const batchLoadingRef = React.useRef(batchLoading);
  batchLoadingRef.current = batchLoading;

  // Keyboard shortcuts for batch actions
  React.useEffect(() => {
    if (!showBatchBar) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (batchLoadingRef.current) return;

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          setConfirmAnalyse(true);
          break;
        case "e":
          e.preventDefault();
          // Use ref to get latest selectedIds
          const exportIds = [...selectedIdsRef.current];
          if (exportIds.length === 0) return;
          handleBatchExport();
          break;
        case "delete":
        case "backspace":
          e.preventDefault();
          setConfirmDelete(true);
          break;
        case "escape":
          e.preventDefault();
          clearSelection();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showBatchBar]);

  const handleBatchAnalyse = async () => {
    setConfirmAnalyse(false);
    setBatchLoading(true);
    try {
      const ids = [...selectedIds];
      const response = await fetch("/api/audits/batch/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditIds: ids }),
      });
      if (!response.ok) throw new Error("Erreur lors de l'analyse");
      addToast(`${ids.length} audit${ids.length > 1 ? "s" : ""} analysé${ids.length > 1 ? "s" : ""} avec succès`, "success");
      clearSelection();
      await fetchAudits();
    } catch (err) {
      addToast("Une erreur est survenue lors de l'analyse", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchExport = async () => {
    setBatchLoading(true);
    try {
      const ids = [...selectedIds];
      const response = await fetch(`/api/audits/export?ids=${ids.join(",")}`);
      if (!response.ok) throw new Error("Erreur lors de l'export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audits-export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      addToast("Export CSV téléchargé", "success");
      clearSelection();
    } catch (err) {
      addToast("Une erreur est survenue lors de l'export", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setConfirmDelete(false);
    const ids = [...selectedIds];
    setBatchLoading(true);
    try {
      const response = await fetch("/api/audits/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditIds: ids }),
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      addToast(`${ids.length} audit${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}`, "success");
      clearSelection();
      await fetchAudits();
    } catch (err) {
      addToast("Une erreur est survenue lors de la suppression", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  // Handle card click: navigate to audit detail
  const handleCardClick = (auditId: string) => {
    router.push(`/audits/${auditId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {showBatchBar ? `${selectionCount} sélectionné${selectionCount > 1 ? "s" : ""}` : `${total} audit${total !== 1 ? "s" : ""}`}
          </h2>
          <p className="text-sm text-neutral-500">
            {showBatchBar ? "Audits sélectionnés" : "Tous vos audits réalisés"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredAudits.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              <CheckSquare className="h-4 w-4" />
              {allFilteredSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
          <Link href="/audits/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Nouvel audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un audit..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Batch Action Bar */}
      {showBatchBar && (
        <div className="sticky top-0 z-20 -mx-4 -mt-2 rounded-none border-b border-info-200 bg-info-50 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-info-700">
              {selectionCount} audit{selectionCount > 1 ? "s" : ""} sélectionné{selectionCount > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirmAnalyse(true)} disabled={batchLoading}>
                {batchLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-1.5 h-4 w-4" />}
                Analyser
              </Button>
              <Button size="sm" variant="secondary" onClick={handleBatchExport} disabled={batchLoading}>
                {batchLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Exporter (CSV)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)} disabled={batchLoading} className="text-error-600 hover:bg-error-50">
                {batchLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                Supprimer
              </Button>
              <button
                onClick={clearSelection}
                className="ml-2 rounded-lg px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-info-100"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audits Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-info-600 border-t-transparent" />
        </div>
      ) : filteredAudits.length === 0 && !searchQuery ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-info-100">
            <BarChart3 className="h-8 w-8 text-info-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">
            Aucun audit pour le moment
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            Commencez par analyser le site web d'un prospect. En 30 secondes,
            vous obtiendrez un rapport complet et un email prêt à envoyer.
          </p>
          <div className="mt-6">
            <Link href="/audits/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Faire mon premier audit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-500">
            Aucun audit ne correspond à votre recherche
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAudits.map((audit) => {
            const isSelected = selectedIds.has(audit.id);
            return (
              <div
                key={audit.id}
                className={`group relative cursor-pointer rounded-xl border overflow-hidden transition-all ${
                  isSelected
                    ? "border-info-400 bg-info-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-info-200 hover:shadow-md"
                }`}
                onClick={() => handleCardClick(audit.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(audit.id); }}
              >
                {/* Checkbox overlay */}
                <div
                  className="absolute left-2 top-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(audit.id);
                  }}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                      isSelected
                        ? "border-info-600 bg-info-600 text-white"
                        : "border-neutral-300 bg-white/90 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Screenshot Preview */}
                <div className="relative h-32 bg-neutral-100">
                  {audit.screenshotUrl ? (
                    <Image
                      src={audit.screenshotUrl}
                      alt={audit.companyName || "Screenshot"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-12 w-12 text-neutral-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                  )}
                  {audit.status === "PROCESSING" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-info-600 border-t-transparent" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-medium transition-colors ${
                        isSelected ? "text-info-700" : "text-neutral-900 group-hover:text-info-600"
                      }`}>
                        {audit.companyName || "Entreprise"}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDate(audit.createdAt)}
                      </p>
                    </div>
                    <Badge variant={getScoreVariant(audit.overallScore ?? null)}>
                      {formatScore(audit.overallScore ?? null)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Batch Delete Modal */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            Supprimer des audits
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            Cette action va supprimer <strong>{selectedIds.size} audit{selectedIds.size > 1 ? "s" : ""}</strong> définitivement.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Annuler
            </button>
            <Button onClick={handleBatchDelete} className="bg-error-600 hover:bg-error-700 text-white">
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Batch Analyse Modal */}
      <Modal open={confirmAnalyse} onClose={() => setConfirmAnalyse(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            Lancer l'analyse en masse
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            Cette action va analyser <strong>{selectedIds.size} audit{selectedIds.size > 1 ? "s" : ""}</strong> et consommer <strong>{selectedIds.size} crédit{selectedIds.size > 1 ? "s" : ""}</strong>.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setConfirmAnalyse(false)}
              className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Annuler
            </button>
            <Button onClick={handleBatchAnalyse}>
              Confirmer l'analyse
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AuditsPage;