"use client";

import { useEffect, useCallback, useRef } from "react";

interface Shortcut {
  /** Keyboard key(s), e.g. "k", "n", "?" */
  key: string;
  /** Whether Cmd (Mac) / Ctrl (Windows) must be held */
  meta?: boolean;
  /** Whether Shift must be held */
  shift?: boolean;
  /** Handler */
  handler: () => void;
  /** If true, handler runs even when focus is in an input/textarea/select */
  allowInInputs?: boolean;
}

/**
 * Registers global keyboard shortcuts.
 * Skips firing when focus is in an editable element (unless allowInInputs is true).
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if focus is in an input/textarea/select (unless shortcut allows it)
    const target = e.target as HTMLElement;
    const isEditable =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;

    for (const s of shortcutsRef.current) {
      const metaPressed = e.metaKey || e.ctrlKey;
      const shiftPressed = e.shiftKey;

      // Meta check
      if (s.meta && !metaPressed) continue;
      if (!s.meta && metaPressed) continue;

      // Shift check
      if (s.shift && !shiftPressed) continue;

      // Key match
      if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;

      // Input focus check
      if (isEditable && !s.allowInInputs) continue;

      e.preventDefault();
      e.stopPropagation();
      s.handler();
      return;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
