"use client";

import * as React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Zap } from "lucide-react";
import { Badge } from '@screencold/ui';

interface CreditCounterProps {
  credits: number;
  plan: string;
  maxCredits?: number;
}

function CreditCounter({ credits, plan, maxCredits }: CreditCounterProps) {
  const [displayCredits, setDisplayCredits] = useState(credits);
  const isLow = credits < 5;

  useEffect(() => {
    if (displayCredits !== credits) {
      const timer = setTimeout(() => {
        setDisplayCredits(credits);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [credits, displayCredits]);

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            "flex h-14 w-14 items-center justify-center rounded-xl",
            isLow ? "bg-error-50" : "bg-info-50"
          )}
        >
          <Zap
            className={clsx(
              "h-7 w-7",
              isLow ? "text-error-500" : "text-info-500"
            )}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">
            Crédits disponibles
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={clsx(
                "text-3xl font-bold transition-colors",
                isLow ? "text-error-600" : "text-neutral-900"
              )}
            >
              {displayCredits}
            </span>
            {maxCredits && (
              <span className="text-sm text-neutral-500">/ {maxCredits}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 sm:mt-0">
        <Badge variant="outline" className="text-sm">
          {plan}
        </Badge>
        {isLow && (
          <Link
            href="/settings/billing"
            className="text-sm font-medium text-info-600 hover:text-info-700"
          >
            Acheter des crédits →
          </Link>
        )}
      </div>
    </div>
  );
}

export { CreditCounter };