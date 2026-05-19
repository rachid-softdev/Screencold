"use client";

import * as React from "react";
import { useState } from "react";
import { clsx } from "clsx";
import { Eye, RotateCcw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProspectStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

interface Prospect {
  id: string;
  url: string;
  companyName?: string;
  status: ProspectStatus;
  score?: number | null;
  createdAt: string;
}

interface ProspectTableProps {
  prospects: Prospect[];
  onView?: (prospect: Prospect) => void;
  onRetry?: (prospect: Prospect) => void;
  onDelete?: (prospect: Prospect) => void;
  pageSize?: number;
}

const statusConfig: Record<
  ProspectStatus,
  { label: string; variant: "default" | "warning" | "success" | "destructive" }
> = {
  PENDING: { label: "En attente", variant: "default" },
  PROCESSING: { label: "En cours", variant: "warning" },
  DONE: { label: "Terminé", variant: "success" },
  FAILED: { label: "Échoué", variant: "destructive" },
};

function ProspectTable({
  prospects,
  onView,
  onRetry,
  onDelete,
  pageSize = 10,
}: ProspectTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(prospects.length / pageSize);
  const paginatedProspects = prospects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (prospects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">
          Aucun prospect dans cette campagne.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Entreprise
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Statut
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedProspects.map((prospect) => {
              const status = statusConfig[prospect.status];
              return (
                <tr
                  key={prospect.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-sm text-gray-900 truncate max-w-[200px] block">
                      {prospect.url}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {prospect.companyName || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {prospect.score !== null && prospect.score !== undefined ? (
                      <Badge
                        variant={
                          prospect.score >= 70
                            ? "success"
                            : prospect.score >= 40
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {prospect.score}/100
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {prospect.status === "DONE" && onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(prospect)}
                          leftIcon={<Eye className="h-4 w-4" />}
                        >
                          Voir
                        </Button>
                      )}
                      {prospect.status === "FAILED" && onRetry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(prospect)}
                          leftIcon={<RotateCcw className="h-4 w-4" />}
                        >
                          Réessayer
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(prospect)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            Affichage {(currentPage - 1) * pageSize + 1} -{" "}
            {Math.min(currentPage * pageSize, prospects.length)} sur{" "}
            {prospects.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Préc
            </Button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Suiv
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { ProspectTable };