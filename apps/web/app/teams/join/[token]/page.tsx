"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InvitationStatus = "loading" | "valid" | "invalid" | "already_member" | "accepted";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  teamName: string;
  inviterName: string;
}

function TeamJoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = React.useState<InvitationStatus>("loading");
  const [invitation, setInvitation] = React.useState<InvitationData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isAccepting, setIsAccepting] = React.useState(false);

  React.useEffect(() => {
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await fetch(`/api/teams/invitations/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          setStatus("invalid");
          setError("Cette invitation n'existe pas ou a expiré.");
        } else {
          setStatus("invalid");
          setError("Une erreur est survenue lors de la validation.");
        }
        return;
      }

      const data = await response.json();
      setInvitation(data.invitation);
      setStatus("valid");
    } catch (err) {
      setStatus("invalid");
      setError("Impossible de valider l'invitation.");
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/teams/invitations/${token}/accept`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "ALREADY_MEMBER") {
          setStatus("already_member");
          setError(data.message || "Vous êtes déjà membre de cette équipe.");
        } else {
          setError(data.message || "Impossible d'accepter l'invitation.");
        }
        return;
      }

      setStatus("accepted");
    } catch (err) {
      setError("Une erreur est survenue lors de l'acceptation.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Validation de l&apos;invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid" || status === "already_member") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="mx-auto w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              {status === "already_member" ? "Déjà membre" : "Invitation invalide"}
            </h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-6 flex justify-center gap-4">
              <Link href="/login">
                <Button variant="secondary">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button>Aller au dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="mx-auto w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Invitation acceptée !
            </h2>
            <p className="mt-2 text-gray-600">
              Vous êtes maintenant membre de &quot;{invitation?.teamName}&quot;
            </p>
            <div className="mt-6">
              <Link href="/dashboard">
                <Button>Aller au dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status is "valid" - show accept form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Invitation à une équipe</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {invitation && (
            <>
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <p className="text-gray-600">
                  <span className="font-medium text-gray-900">{invitation.inviterName}</span>{" "}
                  vous invite à rejoindre l&apos;équipe &quot;{invitation.teamName}&quot;
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Rôle: {invitation.role === "ADMIN" ? "Administrateur" : "Membre"}
                </p>
              </div>

              <p className="text-sm text-gray-500">
                Vous êtes actuellement connecté en tant que: <br />
                <span className="font-medium text-gray-900">(Email du compte)</span>
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={handleAccept} loading={isAccepting}>
                  Accepter l&apos;invitation
                </Button>
                <Link href="/login">
                  <Button variant="secondary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Changer de compte
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamJoinPage;