"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface ShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: "Cmd + K", description: "Palette de commandes" },
      { keys: "G puis D", description: "Tableau de bord" },
      { keys: "G puis A", description: "Audits" },
      { keys: "G puis C", description: "Campagnes" },
      { keys: "G puis P", description: "Paramètres" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: "N", description: "Nouvel audit" },
      { keys: "Maj + N", description: "Nouvelle campagne" },
    ],
  },
  {
    label: "Général",
    shortcuts: [
      { keys: "?", description: "Afficher ce panneau" },
      { keys: "ESC", description: "Fermer / Annuler" },
    ],
  },
];

export function ShortcutsPanel({ open, onClose }: ShortcutsPanelProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Raccourcis clavier"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-100 text-info-600">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Raccourcis clavier
              </h2>
              <p className="text-sm text-neutral-500">
                Utilisez votre clavier pour gagner du temps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.keys}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <span className="text-neutral-700">{sc.description}</span>
                    <kbd className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500 shadow-sm">
                      {sc.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-xs text-neutral-400">
          Les raccourcis fonctionnent hors focus de champ de saisie.
        </p>
      </div>
    </div>,
    document.body
  );
}
