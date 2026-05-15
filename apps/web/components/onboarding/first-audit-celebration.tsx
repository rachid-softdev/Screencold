"use client";

import * as React from "react";
import { PartyPopper, ArrowRight, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FirstAuditCelebrationProps {
  auditId: string;
  onClose: () => void;
}

export function FirstAuditCelebration({
  auditId,
  onClose,
}: FirstAuditCelebrationProps) {
  const [showConfetti, setShowConfetti] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span className="text-2xl">
                {["🎉", "🎊", "✨", "🎯", "🚀"][Math.floor(Math.random() * 5)]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>

          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Bravo ! Votre premier audit est prêt
          </h2>

          <p className="mt-3 text-gray-600">
            Vous venez de gagner du temps précieux. Voici quoi faire ensuite :
          </p>

          <div className="mt-6 w-full space-y-3">
            <Link href={`/audits/${auditId}`} className="block w-full">
              <Button className="w-full" size="lg">
                <Mail className="mr-2 h-4 w-4" />
                Voir l'email généré
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>

            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/audits/${auditId}`
                );
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copier le lien de l'audit
            </Button>
          </div>

          <button
            onClick={onClose}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Continuer sans voir les résultats
          </button>
        </div>
      </div>
    </div>
  );
}
