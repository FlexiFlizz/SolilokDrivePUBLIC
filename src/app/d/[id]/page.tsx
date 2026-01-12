"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Lock, FileIcon, Image, Film, Clock, AlertCircle } from "lucide-react";

interface FileInfo {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  hasPassword: boolean;
  expiresAt: number | null;
  maxDownloads: number | null;
  downloadCount: number;
  createdAt: number;
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
  const now = Date.now();
  const diff = expiresAt - now;
  if (diff <= 0) return "Expiré";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}j ${hours}h restants`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m restants`;
  return `${minutes}m restants`;
}

export default function DownloadPage() {
  const params = useParams();
  const id = params.id as string;

  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    fetchFileInfo();
  }, [id]);

  const fetchFileInfo = async () => {
    try {
      const res = await fetch(`/api/share/${id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fichier non trouvé");
        return;
      }
      const data = await res.json();
      setFileInfo(data);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileInfo) return;

    if (fileInfo.hasPassword && !password) {
      setPasswordError(true);
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    try {
      const url = `/api/share/${id}?download=true${fileInfo.hasPassword ? `&password=${encodeURIComponent(password)}` : ""}`;
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          setPasswordError(true);
          setDownloading(false);
          return;
        }
        setError(data.error);
        setDownloading(false);
        return;
      }

      const contentLength = res.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength) : 0;
      const reader = res.body?.getReader();

      if (!reader) {
        throw new Error("Impossible de lire le fichier");
      }

      const chunks: BlobPart[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setDownloadProgress(Math.round((received / total) * 100));
        }
      }

      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileInfo.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      // Rafraîchir les infos
      fetchFileInfo();
    } catch {
      setError("Erreur lors du téléchargement");
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const isImage = fileInfo?.mimeType?.startsWith("image/");
  const isVideo = fileInfo?.mimeType?.startsWith("video/");

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-bold mb-2">Oops !</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 md:p-8">
            {/* Preview */}
            {isImage && !fileInfo?.hasPassword && (
              <div className="mb-6 rounded-lg overflow-hidden bg-black/20">
                <img
                  src={`/api/share/${id}?download=true`}
                  alt={fileInfo?.originalName}
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}

            {isVideo && !fileInfo?.hasPassword && (
              <div className="mb-6 rounded-lg overflow-hidden bg-black">
                <video
                  src={`/api/share/${id}?download=true`}
                  controls
                  className="w-full max-h-96"
                />
              </div>
            )}

            {/* File info */}
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                {isImage ? (
                  <Image className="w-8 h-8 text-primary" />
                ) : isVideo ? (
                  <Film className="w-8 h-8 text-primary" />
                ) : (
                  <FileIcon className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold truncate">{fileInfo?.originalName}</h1>
                <p className="text-muted-foreground">
                  {formatBytes(fileInfo?.size || 0)} • {formatDate(fileInfo?.createdAt || 0)}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              {fileInfo?.expiresAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{getTimeRemaining(fileInfo.expiresAt)}</span>
                </div>
              )}
              {fileInfo?.maxDownloads && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Download className="w-4 h-4" />
                  <span>{fileInfo.downloadCount}/{fileInfo.maxDownloads} téléchargements</span>
                </div>
              )}
              {fileInfo?.hasPassword && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Protégé par mot de passe</span>
                </div>
              )}
            </div>

            {/* Password input */}
            {fileInfo?.hasPassword && (
              <div className="mb-6">
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg bg-secondary border ${
                    passwordError ? "border-destructive" : "border-transparent"
                  } focus:outline-none focus:ring-2 focus:ring-primary`}
                />
                {passwordError && (
                  <p className="text-destructive text-sm mt-2">Mot de passe incorrect</p>
                )}
              </div>
            )}

            {/* Download progress */}
            {downloading && (
              <div className="mb-6">
                <Progress value={downloadProgress} className="mb-2" />
                <p className="text-center text-muted-foreground">{downloadProgress}%</p>
              </div>
            )}

            {/* Download button */}
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-6 text-lg"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {downloading ? "Téléchargement..." : "Télécharger"}
            </Button>

            {/* QR Code */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-center text-muted-foreground text-sm mb-4">Scanner pour télécharger</p>
              <div className="flex justify-center">
                <img
                  src={`/api/qrcode/${id}`}
                  alt="QR Code"
                  className="w-32 h-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          Partagé via Solilok Drive
        </p>
      </div>
    </main>
  );
}
