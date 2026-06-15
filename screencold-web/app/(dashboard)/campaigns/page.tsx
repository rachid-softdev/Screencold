"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Download, Trash2, CheckSquare, Loader2, Search } from "lucide-react";
import { Button, Input, Modal, useToast } from '@screencold/ui';
import { CampaignList } from "@/components/campaigns/campaign-list";

interface Campaign {
  id: string;
  name: string;
  prospectCount: number;
  doneCount: number;
  createdAt: string;
}

interface ApiCampaign {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    total: number;
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
}

function CampaignsPage() {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const fetchCampaigns = React.useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Une erreur est survenue lors du chargement");
      const json = await res.json();
      const list: ApiCampaign[] = json.data ?? json.campaigns ?? [];
      setCampaigns(
        list.map((c) => ({
          id: c.id,
          name: c.name,
          prospectCount: c.stats.total,
          doneCount: c.stats.done,
          createdAt: c.createdAt,
        }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetchCampaigns().finally(() => setLoading(false));
  }, [fetchCampaigns]);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const selectionCount = selectedIds.size;
  const showBatchBar = selectionCount > 0;

  const filteredCampaigns = React.useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter((c) =>
      c.name.toLowerCase().includes(q)
    );
  }, [campaigns, searchQuery]);

  const selectableCampaigns = searchQuery.trim() ? filteredCampaigns : campaigns;
  const allSelected = selectableCampaigns.length > 0 && selectableCampaigns.every((c) => selectedIds.has(c.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of selectableCampaigns) next.delete(c.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of selectableCampaigns) next.add(c.id);
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const handleBatchExport = async () => {
    setExportLoading(true);
    try {
      const ids = [...selectedIds];
      const response = await fetch(`/api/campaigns/export?ids=${ids.join(",")}`);
      if (!response.ok) throw new Error("Erreur lors de l'export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "campagnes-export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      addToast("Export CSV téléchargé", "success");
      clearSelection();
    } catch (err) {
      addToast("Une erreur est survenue lors de l'export", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setConfirmDelete(false);
    const ids = [...selectedIds];
    setDeleteLoading(true);
    try {
      const response = await fetch("/api/campaigns/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignIds: ids }),
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      addToast(`${ids.length} campagne${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}`, "success");
      clearSelection();
      await fetchCampaigns();
    } catch (err) {
      addToast("Une erreur est survenue lors de la suppression", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Refs to avoid stale closures in keyboard handler
  const anyBatchLoading = exportLoading || deleteLoading;
  const batchLoadingRef = React.useRef(anyBatchLoading);
  batchLoadingRef.current = anyBatchLoading;
  const actionsRef = React.useRef({ handleBatchExport, clearSelection, handleBatchDelete });
  actionsRef.current = { handleBatchExport, clearSelection, handleBatchDelete };

  // Keyboard shortcuts for batch actions
  React.useEffect(() => {
    if (!showBatchBar) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (batchLoadingRef.current) return;

      switch (e.key.toLowerCase()) {
        case "e":
          e.preventDefault();
          actionsRef.current.handleBatchExport();
          break;
        case "delete":
        case "backspace":
          e.preventDefault();
          setConfirmDelete(true);
          break;
        case "escape":
          e.preventDefault();
          actionsRef.current.clearSelection();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showBatchBar]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {showBatchBar ? `${selectionCount} sélectionné${selectionCount > 1 ? "s" : ""}` : `${campaigns.length} campagne${campaigns.length !== 1 ? "s" : ""}`}
          </h2>
          <p className="text-sm text-neutral-500">
            {showBatchBar ? "Campagnes sélectionnées" : "Gérez vos campagnes d'audit et de prospection"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaigns.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              <CheckSquare className="h-4 w-4" />
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
          <Link href="/campaigns/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Nouvelle campagne
            </Button>
          </Link>
        </div>
      </div>

      {/* Batch Action Bar */}
      {showBatchBar && (
        <div className="sticky top-0 z-20 -mx-4 -mt-2 rounded-none border-b border-info-200 bg-info-50 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-info-700">
              {selectionCount} campagne{selectionCount > 1 ? "s" : ""} sélectionné{selectionCount > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleBatchExport} disabled={anyBatchLoading}>
                {exportLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Exporter (CSV)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)} disabled={anyBatchLoading} className="text-error-600 hover:bg-error-50">
                {deleteLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
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

      {/* Search */}
      {!loading && !error && campaigns.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une campagne..."
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-6">
              <div className="h-5 w-3/4 rounded bg-neutral-200" />
              <div className="mt-3 h-4 w-1/2 rounded bg-neutral-100" />
              <div className="mt-4 h-2 rounded-full bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <h3 className="text-sm font-medium text-neutral-900">
            Erreur de chargement
          </h3>
          <p className="mt-1 text-sm text-neutral-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-info-600 px-4 py-2 text-sm text-white hover:bg-info-700"
          >
            Réessayer
          </button>
        </div>
      ) : (
        /* Campaign List */
        <CampaignList
          campaigns={filteredCampaigns}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {/* Confirm Batch Delete Modal */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            Supprimer des campagnes
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            Cette action va supprimer <strong>{selectedIds.size} campagne{selectedIds.size > 1 ? "s" : ""}</strong> définitivement. Les prospects associés seront également retirés.
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
    </div>
  );
}

export default CampaignsPage;