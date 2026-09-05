"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, FileSearch, Megaphone, Settings, Plus } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: "navigation" | "action";
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const categories = [
  { id: "navigation", label: "Navigation" },
  { id: "action", label: "Actions" },
] as const;

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const paletteRef = useFocusTrap(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "go-dashboard",
        label: "Tableau de bord",
        description: "Accéder au tableau de bord",
        category: "navigation",
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => { router.push("/dashboard"); onClose(); },
        shortcut: "G puis D",
      },
      {
        id: "go-audits",
        label: "Audits",
        description: "Voir tous les audits",
        category: "navigation",
        icon: <FileSearch className="h-4 w-4" />,
        action: () => { router.push("/audits"); onClose(); },
        shortcut: "G puis A",
      },
      {
        id: "go-campaigns",
        label: "Campagnes",
        description: "Voir toutes les campagnes",
        category: "navigation",
        icon: <Megaphone className="h-4 w-4" />,
        action: () => { router.push("/campaigns"); onClose(); },
        shortcut: "G puis C",
      },
      {
        id: "go-settings",
        label: "Paramètres",
        description: "Modifier vos paramètres",
        category: "navigation",
        icon: <Settings className="h-4 w-4" />,
        action: () => { router.push("/settings"); onClose(); },
        shortcut: "G puis P",
      },
      {
        id: "new-audit",
        label: "Nouvel audit",
        description: "Analyser le site web d'un prospect",
        category: "action",
        icon: <Plus className="h-4 w-4" />,
        action: () => { router.push("/audits/new"); onClose(); },
        shortcut: "N",
      },
      {
        id: "new-campaign",
        label: "Nouvelle campagne",
        description: "Créer une nouvelle campagne",
        category: "action",
        icon: <Plus className="h-4 w-4" />,
        action: () => { router.push("/campaigns/new"); onClose(); },
        shortcut: "Maj + N",
      },
    ],
    [router, onClose]
  );

  // Filter commands based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;

    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    );
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = [];
    for (const cat of categories) {
      const items = filtered.filter((cmd) => cmd.category === cat.id);
      if (items.length > 0) {
        groups.push({ category: cat.label, items });
      }
    }
    return groups;
  }, [filtered]);

  // Calculate flat index for keyboard navigation
  const flatItems = useMemo(() => {
    return grouped.flatMap((g) => g.items);
  }, [grouped]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay for the animation to start
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flatItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            flatItems[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatItems, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector("[data-selected='true']");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  });

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        ref={paletteRef}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-neutral-200/50"
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-neutral-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une commande..."
            className="flex-1 border-0 bg-transparent px-3 py-4 text-base text-neutral-900 placeholder-neutral-400 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-400 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-neutral-500">
                Aucune commande trouvée pour &quot;{query}&quot;
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400">
                  {group.category}
                </p>
                {group.items.map((item) => {
                  const flatIdx = flatItems.indexOf(item);
                  const isSelected = flatIdx === selectedIndex;
                  return (
                    <button type="button"
                      key={item.id}
                      data-selected={isSelected}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(flatIdx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-info-50 text-info-700"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md ${
                          isSelected ? "bg-info-100 text-info-600" : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-neutral-500">{item.description}</p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="hidden shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-400 sm:inline-block">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-neutral-200 px-4 py-2.5">
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px]">↑↓</kbd>
            <span>Naviguer</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px]">↵</kbd>
            <span>Valider</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px]">ESC</kbd>
            <span>Fermer</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
