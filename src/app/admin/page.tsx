"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  HardDrive,
  Users,
  UserPlus,
  Trash2,
  Shield,
  User,
  ArrowLeft,
  X,
  Key,
  AlertCircle,
  UserX,
  UserCheck,
  FileIcon,
  Clock,
  CheckCircle,
  XCircle,
  Server,
} from "lucide-react";

interface UserInfo {
  id: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: number;
}

interface LoginLog {
  id: string;
  userId: string;
  username: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: number;
}

interface Stats {
  totalStorage: number;
  maxStorage: number;
  filesCount: number;
  usersCount: number;
  storagePercent: number;
  vpsTotal: number;
  vpsUsed: number;
  vpsAvailable: number;
  vpsPercent: number;
}

interface CurrentUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeCode, setPurgeCode] = useState("");
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (!data.user || !data.user.isAdmin) {
        router.push("/login");
        return;
      }

      setCurrentUser(data.user);
      fetchData();
    } catch {
      router.push("/login");
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchUsers(), fetchLogs(), fetchStats()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      console.error("Erreur chargement utilisateurs");
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/login-logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      console.error("Erreur chargement logs");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      console.error("Erreur chargement stats");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdding(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setShowAddUser(false);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      fetchUsers();
    } catch {
      setError("Erreur création utilisateur");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" ?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur suppression");
      }
    } catch {
      alert("Erreur suppression");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleActive: true }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur");
      }
    } catch {
      alert("Erreur");
    }
  };

  const handlePurge = async () => {
    if (purgeCode !== "SUPPRIMER-TOUT") {
      alert("Code de confirmation incorrect");
      return;
    }

    setPurging(true);
    try {
      const res = await fetch("/api/files/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCode: purgeCode }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Drive vidé avec succès");
        setShowPurgeModal(false);
        setPurgeCode("");
        fetchStats();
      } else {
        alert(data.error || "Erreur");
      }
    } catch {
      alert("Erreur lors de la suppression");
    } finally {
      setPurging(false);
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
    <main className="min-h-screen bg-background p-3 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Solilok Drive</h1>
              <p className="text-sm text-muted-foreground">Administration</p>
            </div>
          </div>

          <Button variant="ghost" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Drive</span>
                </div>
                <p className="text-lg md:text-xl font-bold">{stats.storagePercent}%</p>
                <Progress value={stats.storagePercent} className="h-1 mt-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatBytes(stats.totalStorage)} / {formatBytes(stats.maxStorage)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">VPS</span>
                </div>
                <p className="text-lg md:text-xl font-bold">{stats.vpsPercent}%</p>
                <Progress value={stats.vpsPercent} className="h-1 mt-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatBytes(stats.vpsAvailable)} libres
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Fichiers</span>
                </div>
                <p className="text-lg md:text-xl font-bold">{stats.filesCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Utilisateurs</span>
                </div>
                <p className="text-lg md:text-xl font-bold">{stats.usersCount}</p>
              </CardContent>
            </Card>

            <Card className="col-span-2 md:col-span-1 cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => setShowPurgeModal(true)}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-destructive">Vider le Drive</span>
                </div>
                <p className="text-sm md:text-base font-bold text-destructive">Tout supprimer</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("users")}
          >
            <Users className="w-4 h-4 mr-2" />
            Utilisateurs
          </Button>
          <Button
            variant={activeTab === "logs" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("logs")}
          >
            <Clock className="w-4 h-4 mr-2" />
            Connexions
          </Button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Utilisateurs ({users.length})
                </h2>

                <Button size="sm" onClick={() => setShowAddUser(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-2 md:space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 md:p-4 rounded-lg ${
                      user.isActive ? "bg-secondary/50" : "bg-destructive/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      {user.isAdmin ? (
                        <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                      ) : (
                        <User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">
                          {user.username}
                          {user.isAdmin && (
                            <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                          {!user.isActive && (
                            <span className="ml-2 text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                              Désactivé
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Créé le {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>

                    {user.id !== currentUser?.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleActive(user.id)}
                          title={user.isActive ? "Désactiver" : "Activer"}
                        >
                          {user.isActive ? (
                            <UserX className="w-4 h-4 text-orange-500" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 md:mb-6">
                <Clock className="w-5 h-5" />
                Historique des connexions
              </h2>

              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune connexion enregistrée</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                        log.success ? "bg-secondary/50" : "bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        {log.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{log.username}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.ipAddress || "IP inconnue"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </p>
                        <p className={`text-xs ${log.success ? "text-green-500" : "text-destructive"}`}>
                          {log.success ? "Succès" : "Échec"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="mt-6">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold mb-2">Connecté</h3>
            <p className="text-sm text-muted-foreground">
              {currentUser?.username} (Administrateur)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Nouvel utilisateur
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAddUser(false);
                    setError(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="john"
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Key className="w-4 h-4 inline mr-2" />
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="••••••••"
                    required
                    minLength={4}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isAdmin" className="text-sm">
                    Administrateur
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={adding}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {adding ? "Création..." : "Créer l'utilisateur"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" />
                  Vider le Drive
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowPurgeModal(false);
                    setPurgeCode("");
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Attention !</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cette action supprimera <strong>tous les fichiers</strong> du drive de manière permanente.
                        Cette action est irréversible.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pour confirmer, tapez <code className="bg-secondary px-1.5 py-0.5 rounded text-destructive font-mono">SUPPRIMER-TOUT</code>
                  </label>
                  <input
                    type="text"
                    value={purgeCode}
                    onChange={(e) => setPurgeCode(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-destructive text-sm font-mono"
                    placeholder="SUPPRIMER-TOUT"
                    autoComplete="off"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPurgeModal(false);
                      setPurgeCode("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handlePurge}
                    disabled={purging || purgeCode !== "SUPPRIMER-TOUT"}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {purging ? "Suppression..." : "Tout supprimer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
