"use client";

import * as React from "react";
import { Key, Plus, Trash2, Copy, AlertTriangle } from "lucide-react";
import { Button } from '@screencold/ui';
import { Card, CardContent } from '@screencold/ui';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [newKeyValue, setNewKeyValue] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/user/api-keys");
      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewKeyValue(data.rawKey); // Show the key only once!
        setApiKeys([...apiKeys, data.apiKey]);
        setNewKeyName("");
      } else {
        alert(data.message || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette clé API?")) return;
    
    try {
      const response = await fetch(`/api/user/api-keys?id=${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copié dans le presse-papiers!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-info-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Clés API</h1>
          <p className="mt-2 text-neutral-600">Gérez vos clés API pour l'accès programmatique</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle clé
        </Button>
      </div>

      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning-800">Plan requis</p>
            <p className="text-sm text-warning-700">
              L'accès API est disponible uniquement pour les plans Pro et Agency.
            </p>
          </div>
        </div>
      </div>

      {apiKeys.length === 0 ? (
        <div className="text-center py-12">
          <Key className="h-12 w-12 mx-auto text-neutral-400" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">Aucune clé API</h3>
          <p className="mt-2 text-neutral-600">Créez votre première clé API pour accéder au programme.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <p className="text-sm text-neutral-500">{key.keyPrefix}... (masquée)</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {key.rateLimit} requêtes/min • Créée le{" "}
                      {new Date(key.createdAt).toLocaleDateString("fr-FR")}
                      {key.lastUsedAt && ` • Dernière utilisation ${new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteApiKey(key.id)}
                    className="text-error-500 hover:text-error-700 hover:bg-error-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      {(showCreateModal || newKeyValue) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            {newKeyValue ? (
              <>
                <h2 className="text-xl font-bold mb-4 text-success-600">Clé API créée!</h2>
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-warning-800 font-medium">
                    ⚠️ Important: Conservez cette clé en lieu sûr. Elle ne sera affichée qu'une seule fois!
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 p-2 bg-neutral-100 rounded text-sm break-all">
                    {newKeyValue}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(newKeyValue)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={() => { setNewKeyValue(null); setShowCreateModal(false); }} className="w-full">
                  J'ai copié ma clé
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Créer une clé API</h2>
                <label htmlFor="api-key-name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Nom de la clé
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  placeholder="Nom de la clé (ex: Production)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  aria-label="Nom de la clé API"
                  className="w-full p-2 border rounded-md mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createApiKey}>Créer</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}