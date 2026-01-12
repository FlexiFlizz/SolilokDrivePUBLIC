import { NextRequest, NextResponse } from "next/server";
import { readFile, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getFileById, incrementDownloadCount, deleteFile } from "@/lib/db";

const UPLOAD_DIR = "/app/uploads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";
    const providedPassword = searchParams.get("password");

    const fileRecord = getFileById(id);
    if (!fileRecord) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    if (fileRecord.expires_at && Date.now() > fileRecord.expires_at) {
      const filepath = path.join(UPLOAD_DIR, fileRecord.filename);
      if (existsSync(filepath)) await unlink(filepath);
      deleteFile(id);
      return NextResponse.json({ error: "Ce lien a expiré" }, { status: 410 });
    }

    if (fileRecord.max_downloads && fileRecord.download_count >= fileRecord.max_downloads) {
      return NextResponse.json({ error: "Limite de téléchargements atteinte" }, { status: 410 });
    }

    if (!download) {
      return NextResponse.json({
        id: fileRecord.id,
        originalName: fileRecord.original_name,
        size: fileRecord.size,
        mimeType: fileRecord.mime_type,
        hasPassword: !!fileRecord.password,
        expiresAt: fileRecord.expires_at,
        maxDownloads: fileRecord.max_downloads,
        downloadCount: fileRecord.download_count,
        createdAt: fileRecord.created_at,
      });
    }

    if (fileRecord.password && fileRecord.password !== providedPassword) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const filepath = path.join(UPLOAD_DIR, fileRecord.filename);
    if (!existsSync(filepath)) {
      deleteFile(id);
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    incrementDownloadCount(id);
    const fileBuffer = await readFile(filepath);
    const stats = await stat(filepath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileRecord.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileRecord.original_name)}"`,
        "Content-Length": stats.size.toString(),
      },
    });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();
    const fileRecord = getFileById(id);

    if (!fileRecord) return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    if (!fileRecord.password) return NextResponse.json({ valid: true });
    if (fileRecord.password === password) return NextResponse.json({ valid: true });

    return NextResponse.json({ valid: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
