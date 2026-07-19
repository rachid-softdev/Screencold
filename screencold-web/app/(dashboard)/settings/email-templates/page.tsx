"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Copy, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from '@screencold/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@screencold/ui';
import { Input } from '@screencold/ui';
import { Textarea } from '@screencold/ui';
import { Badge } from '@screencold/ui';
import { Modal } from '@screencold/ui';
import { useToast } from '@screencold/ui';

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  userId: string | null;
  createdAt: string;
}

const defaultVariables = [
  { name: "contactName", description: "Prénom du contact" },
  { name: "companyName", description: "Nom de l'entreprise" },
  { name: "score", description: "Score de conversion" },
  { name: "url", description: "URL du site" },
  { name: "issueTitle", description: "Problème principal détecté" },
];

function EmailTemplatesPage() {
  const { addToast } = useToast();
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<EmailTemplate | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    subject: "",
    body: "",
    isDefault: false,
  });

  React.useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/email-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error(err);
      addToast("Erreur lors du chargement des templates", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      subject: "",
      body: "",
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      subject: template.subject,
      body: template.body,
      isDefault: template.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingTemplate
        ? `/api/email-templates/${editingTemplate.id}`
        : "/api/email-templates";

      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        addToast(
          editingTemplate ? "Template mis à jour" : "Template créé",
          "success"
        );
        setIsModalOpen(false);
        fetchTemplates();
      } else {
        const data = await response.json();
        addToast(data.message || "Erreur lors de l'enregistrement", "error");
      }
    } catch (err) {
      addToast("Une erreur est survenue", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${template.name}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/email-templates/${template.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        addToast("Template supprimé", "success");
        fetchTemplates();
      } else {
        addToast("Erreur lors de la suppression", "error");
      }
    } catch (err) {
      addToast("Une erreur est survenue", "error");
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      description: template.description || "",
      subject: template.subject,
      body: template.body,
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + `{{${variable}}}`,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-info-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Templates d&apos;emails
            </h1>
            <p className="text-sm text-neutral-500">
              Personnalisez vos emails de prospection
            </p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-neutral-400" />
              <h3 className="mt-4 font-medium text-neutral-900">
                Aucun template
              </h3>
              <p className="text-sm text-neutral-500">
                Créez votre premier template d&apos;email
              </p>
              <Button className="mt-4" onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Créer un template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-900">{template.name}</h3>
                    {template.isDefault && (
                      <Badge variant="default" className="bg-info-100 text-info-700">
                        Défaut
                      </Badge>
                    )}
                    {template.userId === null && (
                      <Badge variant="outline">Global</Badge>
                    )}
                    {!template.isActive && (
                      <Badge variant="outline">Inactif</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {template.description}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-neutral-400">
                    Sujet: {template.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {template.userId !== null && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        className="text-error-600 hover:text-error-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Variable Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variables disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {defaultVariables.map((v) => (
              <code
                key={v.name}
                className="rounded bg-neutral-100 px-2 py-1 text-sm text-neutral-700"
              >
                {`{{${v.name}}}`}
              </code>
            ))}
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            Utilisez ces variables dans le sujet et le corps de l&apos;email.
            Elles seront remplacées automatiquement lors de la génération.
          </p>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? "Modifier le template" : "Nouveau template"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="templateName" className="block text-sm font-medium text-neutral-700">
              Nom du template
            </label>
            <Input
              id="templateName"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Mon template"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="templateDescription" className="block text-sm font-medium text-neutral-700">
              Description
            </label>
            <Input
              id="templateDescription"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description optionnelle"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="templateSubject" className="block text-sm font-medium text-neutral-700">
              Sujet
            </label>
            <Input
              id="templateSubject"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Sujet de l'email avec {{variables}}"
              required
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="templateBody" className="block text-sm font-medium text-neutral-700">
              Corps de l'email
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {defaultVariables.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className="rounded bg-info-50 px-2 py-1 text-xs text-info-600 hover:bg-info-100"
                >
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
            <Textarea
              id="templateBody"
              value={formData.body}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="Corps de l'email..."
              required
              rows={8}
              className="mt-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
              }
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label htmlFor="isDefault" className="text-sm text-neutral-700">
              Utiliser comme template par défaut
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isSaving}>
              {editingTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EmailTemplatesPage;