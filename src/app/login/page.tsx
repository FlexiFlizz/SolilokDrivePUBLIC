"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState("Solilok Drive");

  useEffect(() => {
    fetch("/api/setup").then(res => res.json()).then(data => {
      if (data.setupRequired) router.push("/setup");
      if (data.appName) setAppName(data.appName);
    }).catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <HardDrive className="w-16 h-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold">Solilok Drive</h1>
            <p className="text-muted-foreground">Connexion</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full py-6"
              size="lg"
              disabled={loading}
            >
              <LogIn className="w-5 h-5 mr-2" />
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
