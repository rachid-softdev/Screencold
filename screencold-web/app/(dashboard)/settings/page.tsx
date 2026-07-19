"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { User, Mail, Trash2, Loader2, Keyboard, RotateCcw } from "lucide-react";
import { Button } from '@screencold/ui';
import { Input } from '@screencold/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@screencold/ui';
import { useToast } from '@screencold/ui';
import { loadShortcuts, saveShortcuts, resetShortcuts, type ShortcutEntry } from "@/lib/shortcut-config";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: string;
  credits: number;
  createdAt: string;
}

function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<{ name?: string }>({});

  // Fetch profile on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) {
          throw new Error("Erreur lors du chargement du profil");
        }
        const data: UserProfile = await response.json();
        setName(data.name || "");
        setEmail(data.email);
      } catch (err) {
        addToast("Erreur lors du chargement du profil", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [addToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrors({ name: "Le nom est requis" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      addToast("Paramètres enregistrés", "success");
      setErrors({});
    } catch (err) {
      addToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      addToast("Compte supprimé", "success");
      router.push("/");
    } catch (err) {
      addToast("Erreur lors de la suppression", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-info-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Paramètres</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Vos informations personnelles
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                aria-label="Nom"
                error={errors.name}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              <Input
                type="email"
                value={email}
                placeholder="votre@email.com"
                aria-label="Email"
                className="pl-10"
                disabled
              />
              <p className="mt-1 text-xs text-neutral-400">
                L'email ne peut pas être modifié
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={isSaving}>
              Enregistrer les modifications
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Integrations - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Intégrations</CardTitle>
          <CardDescription>
            Connectez d&apos;autres services à ScreenCold
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
              <div>
                <p className="font-medium text-neutral-900">Zapier</p>
                <p className="text-sm text-neutral-500">Automatisez vos workflows</p>
              </div>
              <Button variant="secondary" size="sm" disabled>Coming soon</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
              <div>
                <p className="font-medium text-neutral-900">HubSpot</p>
                <p className="text-sm text-neutral-500">Synchronisez vos contacts</p>
              </div>
              <Button variant="secondary" size="sm" disabled>Coming soon</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <ShortcutSettingsCard />

      {/* Danger Zone */}
      <Card className="border-error-200">
        <CardHeader>
          <CardTitle className="text-error-600">Zone dangereuse</CardTitle>
          <CardDescription>
            Actions irréversibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600">
            La suppression de votre compte est définitive. Toutes vos données,
            audits et campagnes seront perdus.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            onClick={handleDeleteAccount} 
            leftIcon={<Trash2 className="h-4 w-4" />}
            loading={isDeleting}
          >
            Supprimer mon compte
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ShortcutSettingsCard() {
  const [shortcuts, setShortcuts] = React.useState<ShortcutEntry[]>([]);
  const [recording, setRecording] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setShortcuts(loadShortcuts());
  }, []);

  const startRecording = (id: string) => {
    setRecording(id);
  };

  const handleRecord = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push("mod");
    if (e.shiftKey && e.key !== "Shift") parts.push("shift");
    const key = e.key.toLowerCase();
    if (!["control", "meta", "shift", "alt"].includes(key)) {
      parts.push(key);
      const newKeys = parts.join("+");
      setShortcuts((prev) =>
        prev.map((s) => (s.id === recording ? { ...s, keys: newKeys } : s))
      );
      setRecording(null);
    }
  };

  const handleSave = () => {
    saveShortcuts(shortcuts);
    setRecording(null);
  };

  const handleReset = () => {
    resetShortcuts();
    setShortcuts(loadShortcuts());
  };

  const displayKey = (keys: string) => {
    return keys
      .replace("mod", "⌘")
      .replace("shift", "⇧")
      .replace(/\+/g, " + ")
      .toUpperCase();
  };

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-100 text-info-600">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Raccourcis clavier</CardTitle>
            <CardDescription>
              Personnalisez vos raccourcis pour accélérer votre navigation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {shortcuts.map((sc) => (
            <div
              key={sc.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5"
            >
              <span className="text-sm text-neutral-700">{sc.label}</span>
              <div className="flex items-center gap-2">
                {recording === sc.id ? (
                  <span
                    className="rounded-md border-2 border-info-400 bg-info-50 px-3 py-1 text-sm font-medium text-info-700"
                    onKeyDown={handleRecord}
                    autoFocus
                    tabIndex={0}
                  >
                    Appuyez...
                  </span>
                ) : (
                  <button
                    onClick={() => startRecording(sc.id)}
                    className={clsx(
                      "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
                      sc.keys !== sc.defaultKeys
                        ? "border-warning-300 bg-warning-50 text-warning-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300"
                    )}
                  >
                    {displayKey(sc.keys)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={handleReset}>
          Réinitialiser
        </Button>
        <Button size="sm" onClick={handleSave}>
          Enregistrer les raccourcis
        </Button>
      </CardFooter>
    </Card>
  );
}

export default SettingsPage;