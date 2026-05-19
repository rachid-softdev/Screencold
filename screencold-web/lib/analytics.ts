"use client";

import * as React from "react";

type EventName =
  | "sign_up"
  | "first_audit"
  | "audit_completed"
  | "email_copied"
  | "upgrade_clicked"
  | "campaign_created"
  | "csv_imported";

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

class Analytics {
  private enabled = false;
  private consentGiven = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Listen for cookie consent changes
      window.addEventListener("cookie-consent", ((e: CustomEvent) => {
        const prefs = e.detail as {
          analytics: boolean;
          marketing: boolean;
        };
        this.consentGiven = prefs.analytics;
        if (prefs.analytics) {
          this.enable();
        }
      }) as EventListener);

      // Check stored consent
      try {
        const stored = localStorage.getItem("screencold-cookie-consent");
        if (stored) {
          const prefs = JSON.parse(stored) as { analytics: boolean };
          this.consentGiven = prefs.analytics;
          if (prefs.analytics) {
            this.enable();
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  private enable() {
    this.enabled = true;
  }

  track(event: EventName, properties?: EventProperties) {
    if (!this.enabled || !this.consentGiven) return;

    // Send to analytics endpoint
    try {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          properties,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      }).catch(() => {
        // Silently fail - analytics should never break the app
      });
    } catch {
      // Silently fail
    }
  }

  page(name: string) {
    if (!this.enabled || !this.consentGiven) return;

    this.track("audit_completed", { page: name });
  }
}

export const analytics = new Analytics();
