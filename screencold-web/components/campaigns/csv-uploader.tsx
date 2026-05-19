"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Upload, FileText, X, Check } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";

interface CSVUploaderProps {
  onUpload: (file: File, preview: Record<string, string>[]) => void;
  maxSize?: number; // in MB
  isUploading?: boolean;
}

function CSVUploader({ onUpload, maxSize = 10, isUploading = false }: CSVUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((content: string): Record<string, string>[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }

    return rows;
  }, []);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      setError(null);

      // Validate file type
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Veuillez sélectionner un fichier CSV");
        return;
      }

      // Validate file size
      if (selectedFile.size > maxSize * 1024 * 1024) {
        setError(`Le fichier est trop volumineux (max ${maxSize} Mo)`);
        return;
      }

      setFile(selectedFile);

      // Read and parse file
      try {
        const content = await selectedFile.text();
        const parsed = parseCSV(content);

        if (parsed.length === 0) {
          setError("Le fichier CSV semble vide ou invalide");
          return;
        }

        setPreview(parsed.slice(0, 5)); // Preview first 5 rows
      } catch (err) {
        setError("Erreur lors de la lecture du fichier");
      }
    },
    [maxSize, parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const handleConfirm = () => {
    if (file && preview) {
      onUpload(file, preview);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  if (file && preview) {
    return (
      <div className="space-y-4">
        {/* Selected file info */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB • {preview.length} lignes
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Aperçu des {Math.min(5, preview.length)} premières lignes
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {Object.keys(preview[0]).map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                        {value || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirm button */}
        <div className="flex justify-end">
          <Button onClick={handleConfirm} loading={isUploading}>
            <Check className="h-4 w-4 mr-2" />
            Importer {preview.length > 5 ? "les 5 premières lignes" : `les ${preview.length} lignes`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Upload className="h-6 w-6 text-gray-400" />
      </div>

      <h3 className="mt-4 text-sm font-medium text-gray-900">
        {dragOver ? "Déposez le fichier ici" : "Glissez un fichier CSV"}
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        ou cliquez pour sélectionner (max {maxSize} Mo)
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export { CSVUploader };