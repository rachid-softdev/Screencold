"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from '@screencold/ui';
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** Cursor-based pagination props */
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;

  /** Offset-based pagination props */
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  /** Optional display: total items across all pages */
  totalItems?: number;
  /** Items per page (default 20, used for "Showing X-Y of Z" display) */
  pageSize?: number;
}

export function Pagination({
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 20,
}: PaginationProps) {
  const isOffset = totalPages !== undefined;
  const activePage = currentPage ?? 1;

  const canGoPrev = isOffset ? activePage > 1 : !!hasPreviousPage;
  const canGoNext = isOffset ? activePage < (totalPages ?? 0) : !!hasNextPage;

  // Build compact page range for offset mode (must be before early returns, hooks rule)
  const pageNumbers = React.useMemo(() => {
    if (!isOffset || !totalPages) return [];
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    const rangeStart = Math.max(2, activePage - 1);
    const rangeEnd = Math.min(totalPages - 1, activePage + 1);
    if (rangeStart > 2) pages.push("ellipsis");
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [isOffset, activePage, totalPages]);

  // Generate "X-Y sur Z" or "Z résultats" text
  const showingText = (() => {
    if (totalItems === undefined) return null;
    if (isOffset) {
      const start = (activePage - 1) * pageSize + 1;
      const end = Math.min(activePage * pageSize, totalItems);
      return `${start}-${end} sur ${totalItems}`;
    }
    return `${totalItems} résultat${totalItems !== 1 ? "s" : ""}`;
  })();

  // Don't render for single-page results
  if (isOffset && totalPages <= 1) return null;
  if (!isOffset && !hasNextPage && !hasPreviousPage) return null;

  const handlePrev = () => {
    if (isOffset) {
      onPageChange?.(activePage - 1);
    } else {
      onPreviousPage?.();
    }
  };

  const handleNext = () => {
    if (isOffset) {
      onPageChange?.(activePage + 1);
    } else {
      onNextPage?.();
    }
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <p className="text-sm text-neutral-500">{showingText}</p>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoPrev}
          onClick={handlePrev}
          aria-label="Page précédente"
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Précédent
        </Button>

        {isOffset &&
          pageNumbers.map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${page}`}
                className="px-1 text-sm text-neutral-400"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === activePage ? "default" : "secondary"}
                size="sm"
                onClick={() => onPageChange?.(page)}
                aria-current={page === activePage ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={cn(
                  page === activePage && "pointer-events-none",
                  "min-w-[2rem]",
                )}
              >
                {page}
              </Button>
            ),
          )}

        <Button
          variant="secondary"
          size="sm"
          disabled={!canGoNext}
          onClick={handleNext}
          aria-label="Page suivante"
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Suivant
        </Button>
      </div>
    </nav>
  );
}
