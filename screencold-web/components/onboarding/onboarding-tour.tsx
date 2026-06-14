"use client";

import * as React from "react";
import { X, ArrowRight, ArrowLeft, Search, BarChart3, Mail } from "lucide-react";
import { Button } from '@screencold/ui';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
}

const steps: Step[] = [
  {
    title: "Entrez une URL",
    description:
      "Saisissez l'adresse du site web de votre prospect dans le champ ci-dessous. C'est tout ce dont vous avez besoin pour commencer.",
    icon: <Search className="h-6 w-6" />,
    target: "[data-tour='quick-audit-form']",
  },
  {
    title: "Consultez les résultats",
    description:
      "Notre IA analyse le site en quelques secondes et identifie les problèmes UX, CRO et de conversion. Un score global est attribué.",
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    title: "Envoyez l'email",
    description:
      "Un email de prospection personnalisé est généré automatiquement. Copiez-le et envoyez-le à votre prospect.",
    icon: <Mail className="h-6 w-6" />,
  },
];

const STORAGE_KEY = "screencold-onboarding-completed";

export function OnboardingTour() {
  const [show, setShow] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);

  React.useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setShow(true);
    }
  }, []);

  // Listen for manual restart from header help menu
  React.useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      setCurrentStep(0);
      setShow(true);
    };
    window.addEventListener("restart-onboarding", handler);
    return () => window.removeEventListener("restart-onboarding", handler);
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">
            {currentStep + 1} / {steps.length}
          </span>
          <button
            onClick={handleComplete}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-info-100 text-info-600">
            {step.icon}
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">{step.title}</h2>
          <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          <Button size="sm" onClick={handleNext}>
            {currentStep === steps.length - 1 ? "Commencer" : "Suivant"}
            {currentStep < steps.length - 1 && (
              <ArrowRight className="ml-1 h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
