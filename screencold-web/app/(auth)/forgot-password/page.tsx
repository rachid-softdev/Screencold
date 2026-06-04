"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const validate = () => {
    if (!email) {
      setError("L'email est requis");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email invalide");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast(data.message || "Une erreur est survenue", "error");
        return;
      }

      setIsSubmitted(true);
      addToast("Si un compte existe, vous recevrez un lien de réinitialisation", "success");
    } catch (err) {
      addToast("Une erreur est survenue", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email envoyé</h1>
          <p className="mt-2 text-sm text-gray-600">
            Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans les prochaines minutes.
          </p>
        </div>

        <div className="text-center">
          <Link href="/login">
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
        <p className="mt-2 text-sm text-gray-600">
          Entrez votre email et nous vous enverrons un lien de réinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            error={error}
            className="pl-10"
          />
        </div>

        <Button type="submit" className="w-full" loading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
          Envoyer le lien
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

export default ForgotPasswordPage;