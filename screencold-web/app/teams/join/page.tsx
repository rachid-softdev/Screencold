"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function TeamJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage("Token d'invitation manquant");
      return;
    }

    const joinTeam = async () => {
      try {
        const response = await fetch('/api/teams', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.message || "Erreur lors de l'adhésion à l'équipe");
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage("Une erreur est survenue");
      }
    };

    joinTeam();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Adhésion à l'équipe en cours...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Invitation invalide</h1>
          <p className="mt-2 text-gray-600">{errorMessage}</p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Erreur</h1>
          <p className="mt-2 text-gray-600">{errorMessage}</p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Bienvenue dans l'équipe!</h1>
        <p className="mt-2 text-gray-600">Vous avez rejoint l'équipe avec succès.</p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button>Aller au tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}