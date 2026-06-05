"use client";

import * as React from "react";
import { Mail, Key, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface Integration {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  lastSyncAt: string | null;
}

function IntegrationsPage() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [gmailConnected, setGmailConnected] = React.useState<boolean | null>(null);
  const [apiKeys, setApiKeys] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check for success/error messages from OAuth callback
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  React.useEffect(() => {
    if (success === "gmail_connected") {
      addToast("Compte Gmail connecté avec succès", "success");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        gmail_auth_failed: "Échec de l'authentification Gmail",
        invalid_params: "Paramètres invalides",
        invalid_state: "État de session invalide",
        user_not_found: "Utilisateur non trouvé",
        token_exchange_failed: "Échec de l'échange de token",
        unknown: "Une erreur est survenue",
      };
      addToast(errorMessages[error] || "Erreur de connexion", "error");
    }
  }, [success, error, addToast]);

  React.useEffect(() => {
    checkIntegrations();
  }, []);

  const checkIntegrations = async () => {
    try {
      // Check Gmail connection
      const userResponse = await fetch("/api/dashboard");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setGmailConnected(userData.user?.gmailConnected ?? false);
      }

      // Fetch API keys
      const apiKeysResponse = await fetch("/api/user/api-keys");
      if (apiKeysResponse.ok) {
        const data = await apiKeysResponse.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGmailConnect = async () => {
    try {
      // Call the authorize API endpoint which generates a proper CSRF-protected state,
      // stores it in a signed cookie, and returns the Google OAuth URL.
      const response = await fetch("/api/auth/gmail/authorize");
      if (!response.ok) {
        const err = await response.json();
        addToast(err.error || "Erreur d'authentification", "error");
        return;
      }
      const data = await response.json();
      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la connexion Gmail", "error");
    }
  };

  const handleGmailDisconnect = async () => {
    try {
      const response = await fetch("/api/user/integrations/gmail", {
        method: "DELETE",
      });
      if (response.ok) {
        addToast("Compte Gmail déconnecté", "success");
        setGmailConnected(false);
      }
    } catch (err) {
      addToast("Erreur lors de la déconnexion", "error");
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette clé API ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        addToast("Clé API supprimée", "success");
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } catch (err) {
      addToast("Erreur lors de la suppression", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Intégrations</h1>
        <p className="text-sm text-gray-500">
          Connectez vos comptes et gérez vos clés API
        </p>
      </div>

      {/* Gmail Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Connectez votre compte Gmail pour envoyer des emails de prospection
                directement depuis votre boîte mail.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={gmailConnected ? "success" : "secondary"}>
                  {gmailConnected ? "Connecté" : "Non connecté"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {gmailConnected ? (
                <Button
                  variant="secondary"
                  onClick={handleGmailDisconnect}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Déconnecter
                </Button>
              ) : (
                <Button onClick={handleGmailConnect}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connecter Gmail
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <h4 className="font-medium text-blue-900">Pourquoi utiliser Gmail ?</h4>
            <ul className="mt-2 list-disc pl-4 text-sm text-blue-800">
              <li>Emails délivrables directement dans la boîte de réception</li>
              <li>Conservation du historique dans votre compte Gmail</li>
              <li>Possibilité de répondre directement depuis Gmail</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Clés API
          </CardTitle>
          <Link href="/settings/api-keys">
            <Button variant="secondary" size="sm">
              Gérer les clés
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-6">
              <Key className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Aucune clé API générée
              </p>
              <Link href="/settings/api-keys" className="mt-2 inline-block">
                <Button variant="secondary" size="sm">
                  Créer une clé API
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-sm text-gray-500">
                      {key.keyPrefix}...  {key.rateLimit} req/min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.lastUsedAt && (
                      <span className="text-xs text-gray-400">
                        Dernière utilisation:{" "}
                        {new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteApiKey(key.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Documentation API</h3>
              <p className="text-sm text-gray-500">
                Apprenez à utiliser l&apos;API ScreenCold dans vos applications
              </p>
            </div>
            <Button variant="secondary">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir la doc
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IntegrationsPage;
