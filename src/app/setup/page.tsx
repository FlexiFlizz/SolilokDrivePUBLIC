"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive, User, Key, Settings, AlertCircle, Check } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [appName, setAppName] = useState("Solilok Drive");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maxStorageGb, setMaxStorageGb] = useState("15");

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const res = await fetch("/api/setup");
      const data = await res.json();
      if (!data.setupRequired) {
        router.push("/login");
      }
    } catch {
      // Setup requis par défaut
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adminPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, adminUsername, adminPassword, maxStorageGb }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Erreur lors de la configuration");
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

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Configuration terminée !</h2>
            <p className="text-muted-foreground">Redirection vers la connexion...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configuration initiale</h1>
              <p className="text-sm text-muted-foreground">Configurez votre Drive</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom de l'application */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <HardDrive className="w-4 h-4 inline mr-2" />
                Nom de l'application
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Mon Drive"
                required
                minLength={2}
              />
            </div>

            {/* Stockage max */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <HardDrive className="w-4 h-4 inline mr-2" />
                Limite de stockage (Go)
              </label>
              <input
                type="number"
                value={maxStorageGb}
                onChange={(e) => setMaxStorageGb(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                min={1}
                max={1000}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Entre 1 et 1000 Go</p>
            </div>

            <hr className="border-secondary" />

            {/* Admin username */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nom d'utilisateur admin
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            {/* Admin password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Mot de passe admin
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
                minLength={4}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
                minLength={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Configuration..." : "Configurer le Drive"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
