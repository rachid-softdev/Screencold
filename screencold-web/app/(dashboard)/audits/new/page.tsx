"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditForm } from "@/components/forms/audit-form";

function NewAuditPage() {

  return (
    <div className="mx-auto max-w-xl">
      {/* Back link */}
      <Link
        href="/audits"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux audits
      </Link>

      {/* Form Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Créer un nouvel audit
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Analysez un site web et générez un email de prospection personnalisé
          </p>
        </div>

        <AuditForm />
      </div>

      {/* Info */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-100">
        <h3 className="text-sm font-medium text-blue-800">
          Comment ça marche ?
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>1. Entrez l&apos;URL du site à auditer</li>
          <li>2. Nous capturons le site et analysons les points d&apos;amélioration</li>
          <li>3. Recevez un score, des recommandations et un email prêt à envoyer</li>
        </ul>
      </div>
    </div>
  );
}

export default NewAuditPage;