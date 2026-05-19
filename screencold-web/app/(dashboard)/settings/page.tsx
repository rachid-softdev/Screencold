"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Building, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
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
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                error={errors.name}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                value={email}
                placeholder="votre@email.com"
                className="pl-10"
                disabled
              />
              <p className="mt-1 text-xs text-gray-400">
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
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">Zapier</p>
                <p className="text-sm text-gray-500">Automatisez vos workflows</p>
              </div>
              <Button variant="secondary" size="sm" disabled>Coming soon</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">HubSpot</p>
                <p className="text-sm text-gray-500">Synchronisez vos contacts</p>
              </div>
              <Button variant="secondary" size="sm" disabled>Coming soon</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Zone dangereuse</CardTitle>
          <CardDescription>
            Actions irréversibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
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

export default SettingsPage;