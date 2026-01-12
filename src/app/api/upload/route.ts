import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { createFile, getValidSession } from "@/lib/db";

const UPLOAD_DIR = "/app/uploads";
const MAX_FILE_SIZE = 15 * 1024 * 1024 * 1024; // 15 Go

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    pdf: "application/pdf",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = getValidSession(sessionId);
    if (!result) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const password = formData.get("password") as string | null;
    const expiresIn = formData.get("expiresIn") as string | null; // en jours
    const maxDownloads = formData.get("maxDownloads") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 15 Go)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Générer un ID unique court
    const id = nanoid(10);

    // Nom de fichier sécurisé
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await writeFile(filepath, buffer);

    // Calculer la date d'expiration
    let expiresAt: number | null = null;
    if (expiresIn && parseInt(expiresIn) > 0) {
      expiresAt = timestamp + parseInt(expiresIn) * 24 * 60 * 60 * 1000;
    }

    // Enregistrer dans la base de données avec l'user_id
    const fileRecord = createFile({
      id,
      filename,
      original_name: file.name,
      size: file.size,
      mime_type: getMimeType(file.name),
      password: password || null,
      expires_at: expiresAt,
      max_downloads: maxDownloads ? parseInt(maxDownloads) : null,
      created_at: timestamp,
      user_id: result.user.id,
    });

    return NextResponse.json({
      success: true,
      id: fileRecord.id,
      filename,
      originalName: file.name,
      size: file.size,
      expiresAt: fileRecord.expires_at,
      maxDownloads: fileRecord.max_downloads,
      hasPassword: !!password,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
