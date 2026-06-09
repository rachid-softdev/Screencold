"use client";

import * as React from "react";
import { useState } from "react";
import { Copy, RefreshCw, Check, Download, Save } from "lucide-react";
import { Button } from '@screencold/ui';
import { useToast } from '@screencold/ui';

interface EmailEditorProps {
  subject: string;
  body: string;
  ps?: string;
  onRegenerate?: () => Promise<void>;
  onSubjectChange?: (subject: string) => void;
  onBodyChange?: (body: string) => void;
  onPsChange?: (ps: string) => void;
  onSave?: () => Promise<void>;
  isRegenerating?: boolean;
  isSaving?: boolean;
}

function EmailEditor({
  subject,
  body,
  ps,
  onRegenerate,
  onSubjectChange,
  onBodyChange,
  onPsChange,
  onSave,
  isRegenerating = false,
  isSaving = false,
}: EmailEditorProps) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [editedSubject, setEditedSubject] = useState(subject);
  const [editedBody, setEditedBody] = useState(body);
  const [editedPs, setEditedPs] = useState(ps || "");

  React.useEffect(() => {
    setEditedSubject(subject);
    setEditedBody(body);
    setEditedPs(ps || "");
  }, [subject, body, ps]);

  const handleCopy = async () => {
    const fullEmail = `Objet: ${editedSubject}\n\n${editedBody}${editedPs ? `\n\n${editedPs}` : ""}`;

    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      addToast("Email copié dans le presse-papiers", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      addToast("Erreur lors de la copie", "error");
    }
  };

  const handleDownload = () => {
    const fullEmail = `Objet: ${editedSubject}\n\n${editedBody}${editedPs ? `\n\n${editedPs}` : ""}`;
    const blob = new Blob([fullEmail], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-prospection-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Email téléchargé", "success");
  };

  return (
    <div className="space-y-4">
      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Objet de l&apos;email
        </label>
        <input
          type="text"
          value={editedSubject}
          onChange={(e) => {
            setEditedSubject(e.target.value);
            onSubjectChange?.(e.target.value);
          }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-info-500 focus:outline-none focus:ring-2 focus:ring-info-200"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Corps de l&apos;email
        </label>
        <textarea
          value={editedBody}
          onChange={(e) => {
            setEditedBody(e.target.value);
            onBodyChange?.(e.target.value);
          }}
          rows={12}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono leading-relaxed focus:border-info-500 focus:outline-none focus:ring-2 focus:ring-info-200 resize-y"
          style={{ whiteSpace: "pre-wrap" }}
        />
      </div>

      {/* P.S. */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          P.S. <span className="text-neutral-400 font-normal">(optionnel)</span>
        </label>
        <input
          type="text"
          value={editedPs}
          onChange={(e) => {
            setEditedPs(e.target.value);
            onPsChange?.(e.target.value);
          }}
          placeholder="Un post-scriptum personnalisé..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-info-500 focus:outline-none focus:ring-2 focus:ring-info-200"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {onSave && (
          <Button
            onClick={onSave}
            loading={isSaving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Sauvegarder
          </Button>
        )}

        <Button
          onClick={handleCopy}
          leftIcon={
            copied ? (
              <Check className="h-4 w-4 text-success-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )
          }
          variant="secondary"
        >
          {copied ? "Copié !" : "Copier"}
        </Button>

        <Button
          onClick={handleDownload}
          leftIcon={<Download className="h-4 w-4" />}
          variant="secondary"
        >
          Télécharger
        </Button>

        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            loading={isRegenerating}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Régénérer
          </Button>
        )}
      </div>
    </div>
  );
}

export { EmailEditor };