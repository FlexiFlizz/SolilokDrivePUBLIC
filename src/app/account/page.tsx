"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  HardDrive,
  ArrowLeft,
  User,
  Key,
  Save,
  AlertCircle,
  Check,
} from "lucide-react";

interface UserInfo {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      const res = await fetch("/api/account");
      const data = await res.json();

      if (!res.ok || !data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setNewUsername(data.user.username);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess("Nom d'utilisateur modifié");
      if (data.user) {
        setUser(data.user);
      }
    } catch {
      setError("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess("Mot de passe modifié avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <HardDrive className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Mon compte</h1>
              <p className="text-muted-foreground">Gérer mes informations</p>
            </div>
          </div>

          <Button variant="ghost" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Infos compte */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations du compte
            </h2>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Type de compte :</span>{" "}
                <span className="font-medium">{user?.isAdmin ? "Administrateur" : "Utilisateur"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Créé le :</span>{" "}
                <span className="font-medium">{user?.createdAt ? formatDate(user.createdAt) : "-"}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Modifier username */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Modifier le nom d'utilisateur
            </h2>

            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  minLength={3}
                  maxLength={20}
                  required
                />
              </div>

              <Button type="submit" disabled={saving || newUsername === user?.username}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Modifier mot de passe */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Modifier le mot de passe
            </h2>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  minLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  minLength={4}
                  required
                />
              </div>

              <Button type="submit" disabled={saving}>
                <Key className="w-4 h-4 mr-2" />
                Changer le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
