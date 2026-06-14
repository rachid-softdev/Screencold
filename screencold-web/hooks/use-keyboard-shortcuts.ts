"use client";

import { useEffect, useCallback, useRef } from "react";

interface Shortcut {
  /** Keyboard key(s), e.g. "k", "n", "?" */
  key: string;
  /** Whether Cmd (Mac) / Ctrl (Windows) must be held */
  meta?: boolean;
  /** Whether Shift must be held */
  shift?: boolean;
  /** Leader key for sequences (e.g. "g" + "d" → navigate dashboard) */
  leader?: string;
  /** Handler */
  handler: () => void;
  /** If true, handler runs even when focus is in an input/textarea/select */
  allowInInputs?: boolean;
}

const LEADER_TIMEOUT = 600; // ms to wait for second key after leader

/**
 * Registers global keyboard shortcuts.
 * Supports leader key sequences (e.g. "g" then "d").
 * Skips firing when focus is in an editable element (unless allowInInputs is true).
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const leaderRef = useRef<{ key: string; timer: ReturnType<typeof setTimeout> | null } | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isEditable =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;

    const metaPressed = e.metaKey || e.ctrlKey;
    const shiftPressed = e.shiftKey;
    const key = e.key.toLowerCase();

    // If leader is active, check for follow-up key
    const leader = leaderRef.current;
    if (leader) {
      const leaderKey = leader.key;

      // Clear leader timer
      if (leader.timer) clearTimeout(leader.timer);
      leaderRef.current = null;

      // Check if the current key completes a leader sequence
      for (const s of shortcutsRef.current) {
        if (s.leader?.toLowerCase() !== leaderKey) continue;
        if (s.key.toLowerCase() !== key) continue;

        if (isEditable && !s.allowInInputs) continue;
        if (s.meta && !metaPressed) continue;
        if (!s.meta && metaPressed) continue;
        if (s.shift && !shiftPressed) continue;

        e.preventDefault();
        e.stopPropagation();
        s.handler();
        return; // matched, done
      }

      // Key didn't match any leader sequence — fall through to check regular shortcuts
    }

    // Check if this key starts a leader sequence
    const hasLeader = shortcutsRef.current.some(
      (s) => s.leader?.toLowerCase() === key && !s.meta && !metaPressed
    );

    if (hasLeader && !metaPressed && !isEditable) {
      // Start leader sequence
      const prevLeader = leaderRef.current;
      if (prevLeader?.timer) clearTimeout(prevLeader.timer);
      leaderRef.current = {
        key,
        timer: setTimeout(() => {
          leaderRef.current = null;
        }, LEADER_TIMEOUT),
      };
      return;
    }

    // Regular shortcut matching
    for (const s of shortcutsRef.current) {
      if (s.leader) continue; // skip leader shortcuts, handled above

      // Meta check
      if (s.meta && !metaPressed) continue;
      if (!s.meta && metaPressed) continue;

      // Shift check
      if (s.shift && !shiftPressed) continue;

      // Key match
      if (s.key.toLowerCase() !== key) continue;

      // Input focus check
      if (isEditable && !s.allowInInputs) continue;

      e.preventDefault();
      e.stopPropagation();
      s.handler();
      return;
    }
  }, []);

  // Clear leader on blur
  useEffect(() => {
    const handleBlur = () => {
      if (leaderRef.current?.timer) {
        clearTimeout(leaderRef.current.timer);
      }
      leaderRef.current = null;
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
