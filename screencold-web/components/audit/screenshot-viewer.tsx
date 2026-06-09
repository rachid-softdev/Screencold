"use client";

import * as React from "react";
import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { Monitor, Smartphone, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";
import { LoadingSpinner } from '@screencold/ui';

interface ScreenshotViewerProps {
  desktopUrl?: string | null;
  mobileUrl?: string | null;
  alt?: string;
  isLoading?: boolean;
  error?: string | null;
}

function ScreenshotViewer({
  desktopUrl,
  mobileUrl,
  alt = "Screenshot",
  isLoading = false,
  error = null,
}: ScreenshotViewerProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [zoom, setZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);

  const currentUrl = viewMode === "mobile" ? mobileUrl : desktopUrl;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-neutral-500">Capture en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-error-200 bg-error-50 p-6">
        <AlertCircle className="h-12 w-12 text-error-400" />
        <h3 className="mt-4 text-sm font-medium text-error-800">
          Erreur de capture
        </h3>
        <p className="mt-1 text-center text-sm text-error-600">{error}</p>
      </div>
    );
  }

  if (!currentUrl) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Monitor className="h-12 w-12 text-neutral-300" />
        <p className="mt-4 text-sm text-neutral-500">
          Capture non disponible
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
        {/* View Toggle */}
        <div className="flex rounded-lg border border-neutral-200 p-0.5">
          <button
            onClick={() => setViewMode("desktop")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "desktop"
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "mobile"
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900",
              !mobileUrl && "opacity-50 cursor-not-allowed"
            )}
            disabled={!mobileUrl}
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            aria-label="Zoom arrière"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-sm text-neutral-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            aria-label="Zoom avant"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="relative h-96 overflow-auto bg-neutral-100"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
      >
        <div
          className={clsx(
            "relative min-h-full min-w-full transition-transform duration-200",
            isZooming && zoom > 1 && "scale-110"
          )}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <Image
            src={currentUrl}
            alt={`${alt} - ${viewMode}`}
            width={viewMode === "mobile" ? 375 : 1440}
            height={viewMode === "mobile" ? 812 : 900}
            className="min-w-full object-contain"
            quality={90}
          />
        </div>
      </div>
    </div>
  );
}

export { ScreenshotViewer };