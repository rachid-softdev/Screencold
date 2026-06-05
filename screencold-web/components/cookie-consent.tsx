"use client";

import * as React from "react";
import { Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "screencold-cookie-consent";

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CookiePreferences;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function storePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [preferences, setPreferences] = React.useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  React.useEffect(() => {
    const stored = getStoredPreferences();
    if (!stored) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const prefs = { necessary: true, analytics: true, marketing: true };
    storePreferences(prefs);
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    // Dispatch event for analytics to pick up
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: prefs }));
  };

  const handleRejectAll = () => {
    const prefs = { necessary: true, analytics: false, marketing: false };
    storePreferences(prefs);
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: prefs }));
  };

  const handleSavePreferences = () => {
    storePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
    window.dispatchEvent(
      new CustomEvent("cookie-consent", { detail: preferences })
    );
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              Nous utilisons des cookies pour améliorer votre expérience. Les
              cookies nécessaires sont indispensables au fonctionnement du site.
              Les cookies analytics nous aident à comprendre comment vous
              utilisez ScreenCold.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="mr-1 h-4 w-4" />
              Personnaliser
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRejectAll}>
              Refuser
            </Button>
            <Button size="sm" onClick={handleAcceptAll}>
              <Check className="mr-1 h-4 w-4" />
              Tout accepter
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mx-auto mt-4 max-w-7xl rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Préférences cookies
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Nécessaires
                  </span>
                  <p className="text-xs text-gray-500">
                    Indispensables au fonctionnement du site
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Analytics
                  </span>
                  <p className="text-xs text-gray-500">
                    Nous aident à améliorer le site
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      analytics: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Marketing
                  </span>
                  <p className="text-xs text-gray-500">
                    Pour des publicités personnalisées
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      marketing: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={handleSavePreferences}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
