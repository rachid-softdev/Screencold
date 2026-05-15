"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Plus, Mail, Trash2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Team {
  id: string;
  name: string;
  role: string;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  }>;
}

export default function TeamsPage() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");

  React.useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();
      setTeams([...data.ownedTeams, ...data.memberTeams]);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
      });

      if (response.ok) {
        const data = await response.json();
        setTeams([...teams, data.team]);
        setShowCreateModal(false);
        setNewTeamName("");
      }
    } catch (error) {
      console.error("Failed to create team:", error);
    }
  };

  const copyInviteLink = (teamId: string, token: string) => {
    const link = `${window.location.origin}/teams/join?token=${token}`;
    navigator.clipboard.writeText(link);
    alert("Lien d'invitation copié!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Équipes</h1>
          <p className="mt-2 text-gray-600">Gérez vos équipes et invitations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle équipe
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune équipe</h3>
          <p className="mt-2 text-gray-600">Créez votre première équipe pour collaborate.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{team.name}</CardTitle>
                  {team.role === "OWNER" && <Crown className="h-5 w-5 text-yellow-500" />}
                </div>
                <CardDescription>
                  {team.members.length} membre{team.members.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team.members.slice(0, 3).map((member) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {member.name?.charAt(0) || member.email.charAt(0)}
                      </div>
                      <span className="truncate">{member.name || member.email}</span>
                      {member.role === "OWNER" && (
                        <span className="text-xs text-yellow-600">Proprio</span>
                      )}
                    </div>
                  ))}
                  {team.members.length > 3 && (
                    <p className="text-sm text-gray-500">+{team.members.length - 3} autres</p>
                  )}
                </div>
                {team.role === "OWNER" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      // Open invite modal
                      alert("Fonctionnalité d'invitation à venir");
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Inviter
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Créer une équipe</h2>
            <input
              type="text"
              placeholder="Nom de l'équipe"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button onClick={createTeam}>Créer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}