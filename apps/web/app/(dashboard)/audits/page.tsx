"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [audits, setAudits] = React.useState<Audit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);

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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {total} audit{total !== 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-gray-500">
            Tous vos audits réalisés
          </p>
        </div>
        <Link href="/audits/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nouvel audit
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un audit..."
            className="pl-10"
          />
        </div>
        <Button variant="secondary" leftIcon={<Filter className="h-4 w-4" />}>
          Filtres
        </Button>
      </div>

      {/* Audits Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            {searchQuery ? "Aucun audit ne correspond à votre recherche" : "Aucun audit pour le moment"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAudits.map((audit) => (
            <Link
              key={audit.id}
              href={`/audits/${audit.id}`}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden transition-all hover:border-blue-200 hover:shadow-md"
            >
              {/* Screenshot Preview */}
              <div className="relative h-32 bg-gray-100">
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
                      className="h-12 w-12 text-gray-300"
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
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                      {audit.companyName || "Entreprise"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(audit.createdAt)}
                    </p>
                  </div>
                  <Badge variant={getScoreVariant(audit.overallScore)}>
                    {audit.overallScore !== null ? `${audit.overallScore}/100` : "En cours"}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditsPage;