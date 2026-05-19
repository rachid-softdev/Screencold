"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Play, Pause, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CampaignProgressProps {
  total: number;
  done: number;
  processing: number;
  failed: number;
  pending: number;
  isRunning?: boolean;
  onLaunch?: () => void;
  onPause?: () => void;
}

function CampaignProgress({
  total,
  done,
  processing,
  failed,
  pending,
  isRunning = false,
  onLaunch,
  onPause,
}: CampaignProgressProps) {
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Progression de la campagne
        </h3>
        {onLaunch && pending > 0 && !isRunning && (
          <Button size="sm" onClick={onLaunch} leftIcon={<Play className="h-4 w-4" />}>
            Lancer les audits
          </Button>
        )}
        {onPause && isRunning && (
          <Button size="sm" variant="secondary" onClick={onPause} leftIcon={<Pause className="h-4 w-4" />}>
            Pause
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              progress === 100 ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {done} / {total} audits complétés ({Math.round(progress)}%)
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{done}</p>
            <p className="text-xs text-gray-500">Terminés</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{processing}</p>
            <p className="text-xs text-gray-500">En cours</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{failed}</p>
            <p className="text-xs text-gray-500">Échoués</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Clock className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{pending}</p>
            <p className="text-xs text-gray-500">En attente</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CampaignProgress };