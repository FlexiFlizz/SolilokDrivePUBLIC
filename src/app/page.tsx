"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  Trash2,
  FileIcon,
  HardDrive,
  Copy,
  Check,
  Link,
  QrCode,
  Lock,
  Clock,
  X,
  Image,
  Film,
  Music,
  LogOut,
  Settings,
  Eye,
  User,
  Sun,
  Moon,
} from "lucide-react";

interface FileInfo {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  hasPassword: boolean;
  expiresAt: number | null;
  maxDownloads: number | null;
  downloadCount: number;
  createdAt: number;
}

interface UploadOptions {
  password: string;
  expiresIn: string;
  maxDownloads: string;
}

interface CurrentUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface Stats {
  totalStorage: number;
  maxStorage: number;
  filesCount: number;
  usersCount: number;
  storagePercent: number;
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeRemaining(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expiré";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}j`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h`;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQrId, setShowQrId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [options, setOptions] = useState<UploadOptions>({
    password: "",
    expiresIn: "7",
    maxDownloads: "",
  });

  // Theme management
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : true;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

  // Vérifier l'authentification
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setAuthLoading(false);
    } catch {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      console.error("Erreur chargement fichiers");
    }
  }, [router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      console.error("Erreur chargement stats");
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchFiles();
      fetchStats();
    }
  }, [authLoading, user, fetchFiles, fetchStats]);

  const uploadFile = async (file: File, opts: UploadOptions) => {
    const formData = new FormData();
    formData.append("file", file);
    if (opts.password) formData.append("password", opts.password);
    if (opts.expiresIn) formData.append("expiresIn", opts.expiresIn);
    if (opts.maxDownloads) formData.append("maxDownloads", opts.maxDownloads);

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) resolve();
        else reject(new Error("Upload failed"));
      });
      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  const handleUploadWithOptions = async () => {
    if (pendingFiles.length === 0) return;

    setShowOptions(false);
    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setCurrentFile(`${file.name} (${i + 1}/${pendingFiles.length})`);
        setUploadProgress(0);
        await uploadFile(file, options);
      }
      fetchFiles();
      fetchStats();
    } catch {
      setError("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFile("");
      setPendingFiles([]);
      setOptions({ password: "", expiresIn: "7", maxDownloads: "" });
    }
  };

  const handleFilesSelected = (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    setPendingFiles(filesArray);
    setShowOptions(true);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm("Supprimer ce fichier ?")) return;
    try {
      await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: "DELETE" });
      fetchFiles();
      fetchStats();
    } catch {
      setError("Erreur suppression");
    }
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/d/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const isImage = (mime: string) => mime?.startsWith("image/");
  const isVideo = (mime: string) => mime?.startsWith("video/");
  const isAudio = (mime: string) => mime?.startsWith("audio/");

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-3 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Solilok Drive</h1>
              <p className="text-sm text-muted-foreground">Max 15 Go</p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={darkMode ? "Mode clair" : "Mode sombre"}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push("/account")} title="Mon compte">
              <User className="w-4 h-4" />
            </Button>
            {user?.isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} title="Administration">
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Upload Zone */}
        <Card className="mb-6 md:mb-8">
          <CardContent className="p-0">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 md:p-12 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />

              {uploading ? (
                <div className="space-y-4">
                  <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto text-primary animate-pulse" />
                  <p className="text-sm md:text-lg font-medium truncate">{currentFile}</p>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                  <p className="text-muted-foreground">{uploadProgress}%</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-base md:text-lg font-medium">Glisse tes fichiers ici</p>
                    <p className="text-sm text-muted-foreground">ou clique pour sélectionner</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* File List */}
        <div className="space-y-2 md:space-y-3">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Fichiers ({files.length})</h2>

          {files.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center text-muted-foreground">
                <FileIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun fichier</p>
              </CardContent>
            </Card>
          ) : (
            files.map((file) => (
              <Card key={file.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex-shrink-0 hidden sm:block">
                      {isImage(file.mimeType) ? (
                        <Image className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                      ) : isVideo(file.mimeType) ? (
                        <Film className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                      ) : isAudio(file.mimeType) ? (
                        <Music className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                      ) : (
                        <FileIcon className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{file.originalName}</p>
                      <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                        <span>{formatBytes(file.size)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{formatDate(file.createdAt)}</span>
                        {file.hasPassword && <Lock className="w-3 h-3" />}
                        {file.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeRemaining(file.expiresAt)}
                          </span>
                        )}
                        {file.maxDownloads && (
                          <span>{file.downloadCount}/{file.maxDownloads}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
                      {(isImage(file.mimeType) || isVideo(file.mimeType) || isAudio(file.mimeType)) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 md:h-9 md:w-9"
                          onClick={() => setPreviewFile(file)}
                          title="Prévisualiser"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => copyLink(file.id)}
                        title="Copier le lien"
                      >
                        {copiedId === file.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Link className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden sm:flex h-8 w-8 md:h-9 md:w-9"
                        onClick={() => setShowQrId(showQrId === file.id ? null : file.id)}
                        title="QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>

                      <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" asChild>
                        <a
                          href={`/api/files/${encodeURIComponent(file.name)}`}
                          download={file.originalName}
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                        onClick={() => handleDelete(file.name)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* QR Code expanded */}
                  {showQrId === file.id && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-col items-center">
                      <img src={`/api/qrcode/${file.id}`} alt="QR Code" className="w-32 h-32 md:w-40 md:h-40" />
                      <p className="text-xs md:text-sm text-muted-foreground mt-2 break-all text-center">
                        {window.location.origin}/d/{file.id}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Storage bar - fixed bottom left */}
      {stats && (
        <div className="fixed bottom-4 left-4 bg-card border border-border rounded-lg p-3 shadow-lg max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Stockage</span>
          </div>
          <Progress value={stats.storagePercent} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            {formatBytes(stats.totalStorage)} / {formatBytes(stats.maxStorage)}
          </p>
        </div>
      )}

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold">Options d'upload</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowOptions(false);
                    setPendingFiles([]);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {pendingFiles.length} fichier(s) sélectionné(s)
                  </p>
                  <div className="max-h-20 overflow-y-auto text-sm">
                    {pendingFiles.map((f, i) => (
                      <p key={i} className="truncate">{f.name}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Mot de passe (optionnel)
                  </label>
                  <input
                    type="password"
                    value={options.password}
                    onChange={(e) => setOptions({ ...options, password: e.target.value })}
                    placeholder="Laisser vide = pas de mot de passe"
                    className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Expiration
                  </label>
                  <select
                    value={options.expiresIn}
                    onChange={(e) => setOptions({ ...options, expiresIn: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="7">7 jours (par défaut)</option>
                    <option value="14">14 jours</option>
                    <option value="21">21 jours</option>
                    <option value="30">30 jours (max)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Download className="w-4 h-4 inline mr-2" />
                    Limite de téléchargements
                  </label>
                  <select
                    value={options.maxDownloads}
                    onChange={(e) => setOptions({ ...options, maxDownloads: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">Illimité</option>
                    <option value="1">1 téléchargement</option>
                    <option value="5">5 téléchargements</option>
                    <option value="10">10 téléchargements</option>
                    <option value="50">50 téléchargements</option>
                  </select>
                </div>

                <Button onClick={handleUploadWithOptions} className="w-full mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader {pendingFiles.length} fichier(s)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="relative w-full max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>

            <div className="bg-black rounded-lg overflow-hidden">
              {isImage(previewFile.mimeType) && (
                <img
                  src={`/api/files/${encodeURIComponent(previewFile.name)}`}
                  alt={previewFile.originalName}
                  className="max-w-full max-h-[80vh] mx-auto"
                />
              )}

              {isVideo(previewFile.mimeType) && (
                <video
                  src={`/api/files/${encodeURIComponent(previewFile.name)}`}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] mx-auto"
                />
              )}

              {isAudio(previewFile.mimeType) && (
                <div className="p-6 md:p-8 flex flex-col items-center gap-4">
                  <Music className="w-16 h-16 md:w-24 md:h-24 text-primary" />
                  <p className="text-white text-sm md:text-lg text-center truncate max-w-full">{previewFile.originalName}</p>
                  <audio
                    src={`/api/files/${encodeURIComponent(previewFile.name)}`}
                    controls
                    autoPlay
                    className="w-full max-w-md"
                  />
                </div>
              )}
            </div>

            <p className="text-center text-white/70 mt-2 md:mt-4 text-sm truncate">{previewFile.originalName}</p>
          </div>
        </div>
      )}
    </main>
  );
}
