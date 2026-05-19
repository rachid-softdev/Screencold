"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { addToast } = useToast();
  
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 8) {
      newErrors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }

    if (!confirmPassword) {
      newErrors.confirm = "Veuillez confirmer votre mot de passe";
    } else if (password !== confirmPassword) {
      newErrors.confirm = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      addToast("Token de réinitialisation manquant", "error");
      return;
    }

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast(data.message || "Une erreur est survenue", "error");
        return;
      }

      setIsSuccess(true);
      addToast("Mot de passe mis à jour avec succès", "success");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      addToast("Une erreur est survenue", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Lien invalide</h1>
          <p className="mt-2 text-sm text-gray-600">
            Le lien de réinitialisation est invalide ou a expiré
          </p>
        </div>
        <div className="text-center">
          <Link href="/forgot-password">
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Demander un nouveau lien
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe modifié</h1>
          <p className="mt-2 text-sm text-gray-600">
            Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion...
          </p>
        </div>
        <div className="text-center">
          <Link href="/login">
            <Button>
              Se connecter maintenant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-gray-600">
          Entrez votre nouveau mot de passe
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            error={errors.password}
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            error={errors.confirm}
            className="pl-10"
          />
        </div>

        <Button type="submit" className="w-full" loading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
          Mettre à jour le mot de passe
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default ResetPasswordPage;