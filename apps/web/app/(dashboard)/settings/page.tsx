"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Building, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("Jean Dupont");
  const [email, setEmail] = React.useState("jean@example.com");
  const [company, setCompany] = React.useState("Mon Agence");
  const [errors, setErrors] = React.useState<{ name?: string; email?: string }>({});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Le nom est requis";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email invalide";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Simulate save
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addToast("Paramètres enregistrés", "success");
      setErrors({});
    } catch (err) {
      addToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      addToast("Compte supprimé", "success");
      router.push("/");
    }
  };

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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                error={errors.email}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nom de votre entreprise"
                className="pl-10"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={isSaving}>
              Enregistrer les modifications
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Integrations */}
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
              <Button variant="secondary" size="sm">Connecter</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">HubSpot</p>
                <p className="text-sm text-gray-500">Synchronisez vos contacts</p>
              </div>
              <Button variant="secondary" size="sm">Connecter</Button>
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
          <Button variant="destructive" onClick={handleDeleteAccount} leftIcon={<Trash2 className="h-4 w-4" />}>
            Supprimer mon compte
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SettingsPage;