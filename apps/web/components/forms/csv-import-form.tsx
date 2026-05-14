"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CSVUploader } from "@/components/campaigns/csv-uploader";
import { useToast } from "@/components/ui/toast";

interface CSVImportFormProps {
  onSubmit: (campaignName: string, file: File) => Promise<void>;
  isLoading?: boolean;
}

function CSVImportForm({ onSubmit, isLoading = false }: CSVImportFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [campaignName, setCampaignName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const handleFileUpload = (uploadedFile: File, previewData: Record<string, string>[]) => {
    setFile(uploadedFile);
    setPreview(previewData);
    setStep("preview");
  };

  const handleBack = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignName.trim()) {
      addToast("Veuillez entrer un nom de campagne", "error");
      return;
    }

    if (!file) {
      addToast("Veuillez sélectionner un fichier CSV", "error");
      return;
    }

    try {
      await onSubmit(campaignName, file);
      addToast("Campagne créée avec succès", "success");
      router.push("/campaigns");
    } catch (err) {
      addToast("Une erreur est survenue", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        type="text"
        value={campaignName}
        onChange={(e) => setCampaignName(e.target.value)}
        label="Nom de la campagne"
        placeholder="Ex: Prospects Janvier 2024"
        required
      />

      {step === "upload" ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Import CSV
          </label>
          <CSVUploader onUpload={handleFileUpload} isUploading={isLoading} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              <strong>Fichier sélectionné:</strong> {file?.name}
            </p>
            <p className="mt-1 text-sm text-green-700">
              {preview?.length} prospects trouvés dans le fichier
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 text-sm text-green-600 underline hover:text-green-700"
            >
              Changer de fichier
            </button>
          </div>

          {/* Column mapping info */}
          {preview && preview.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Colonnes détectées:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(preview[0]).map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Assurez-vous que vos colonnes incluent: URL (colonne obligatoire),
                Nom de l&apos;entreprise, Email (optionnel)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleBack}>
              Retour
            </Button>
            <Button type="submit" loading={isLoading}>
              Créer la campagne
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

export { CSVImportForm };