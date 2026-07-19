"use client";

import * as React from "react";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button, Input, Header, useToast } from '@screencold/ui';

function ContactPage() {
  const { addToast } = useToast();
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = "Le nom est requis";
    if (!formData.email) newErrors.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Email invalide";
    if (!formData.subject) newErrors.subject = "Le sujet est requis";
    if (!formData.message) newErrors.message = "Le message est requis";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi");
      }
      
      addToast("Message envoyé avec succès !", "success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      addToast("Erreur lors de l'envoi du message", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact Info */}
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Contactez-nous</h1>
            <p className="mt-4 text-lg text-neutral-600">
              Une question ? Un problème ? Notre équipe est là pour vous aider.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-100">
                  <Mail className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">Email</h3>
                  <p className="text-sm text-neutral-600">support@screencold.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-100">
                  <Phone className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">Téléphone</h3>
                  <p className="text-sm text-neutral-600">Du lundi au vendredi, 9h-18h</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-100">
                  <MapPin className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">Adresse</h3>
                  <p className="text-sm text-neutral-600">Paris, France</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Nom"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={errors.email}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <Input
                label="Sujet"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                error={errors.subject}
                placeholder="Sujet de votre message"
              />

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-neutral-700">Message</label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  aria-invalid={errors.message ? "true" : undefined}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  rows={5}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 placeholder-neutral-400 focus:border-info-500 focus:outline-none focus:ring-2 focus:ring-info-500"
                  placeholder="Décrivez votre problème ou votre question..."
                />
                {errors.message && <p id="message-error" className="mt-1 text-sm text-error-600">{errors.message}</p>}
              </div>

              <Button type="submit" className="w-full" loading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Envoyer le message
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">© 2026 ScreenCold. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

export default ContactPage;